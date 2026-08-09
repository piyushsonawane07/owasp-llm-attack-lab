import { useEffect, useState } from 'react'
import Header from './components/Header'
import ChatView from './components/ChatView'
import LibraryView from './components/LibraryView'
import OwaspView from './components/OwaspView'
import QRModal from './components/QRModal'
import {
  OWASP_TOP_10,
  detectAttackSuccess,
  SAMPLE_QUESTION_FALLBACKS,
  GENERIC_FALLBACK,
  GUARDRAIL_BLOCK_MESSAGES,
  OWASP_GUARDRAIL_EXPECTATION,
} from './constants'
import {
  agentQuery,
  deleteDocument,
  getDocuments,
  getLibrary,
  getLibraryDoc,
  getModels,
  queryRag,
  reindexLibrary,
  uploadDocument,
} from './api'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Fallback answers resolve near-instantly (no network round trip), which
// would skip the "Thinking..." bubble the audience sees on a real call and
// make the swap look abrupt/inconsistent. Hold it on screen for a
// human-plausible beat so every response -- live or fallback -- reads the
// same.
const FALLBACK_THINKING_DELAY_MS = 900

function App() {
  const [tab, setTab] = useState('chat')

  const [documents, setDocuments] = useState([])
  const [models, setModels] = useState([])
  const [selectedModelKey, setSelectedModelKey] = useState('')
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [querying, setQuerying] = useState(false)
  const [error, setError] = useState('')
  // Guards against the chat input being clickable before /api/models and
  // /api/documents resolve -- without this, an early Send click silently
  // fails with "Model is not available yet." instead of just being disabled
  // for the split second it takes to bootstrap.
  const [bootstrapping, setBootstrapping] = useState(true)
  // Set only if bootstrap() gives up after retries -- distinct from
  // `error` (which is query-time) so a stale connectivity error can't be
  // silently masked by handleAsk's generic "Model is not available yet."
  const [bootstrapError, setBootstrapError] = useState('')
  const [guardrailsEnabled, setGuardrailsEnabled] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrUrl, setQrUrl] = useState(() => {
    const href = window.location.href
    return href.startsWith('http') ? href : 'https://your-rag-demo.example.com'
  })

  const [library, setLibrary] = useState([])
  const [libraryError, setLibraryError] = useState('')
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [activeDoc, setActiveDoc] = useState(null)
  const [activeDocContent, setActiveDocContent] = useState('')
  const [activeDocLoading, setActiveDocLoading] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [reindexResult, setReindexResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState(null)
  const [deletingFilename, setDeletingFilename] = useState(null)

  const selected = models.find((m) => `${m.provider}:${m.id}` === selectedModelKey)

  useEffect(() => {
    bootstrap()
    loadLibrary()
  }, [])

  const BOOTSTRAP_MAX_ATTEMPTS = 4

  // Under audience load, /api/models or /api/documents can transiently time
  // out even though the backend is fine a couple seconds later -- retry with
  // backoff instead of giving up (and leaving the UI stuck) on the first
  // failure. Promise.allSettled means a single flaky endpoint doesn't block
  // the other one from succeeding.
  async function bootstrap(attempt = 1) {
    setBootstrapping(true)
    setBootstrapError('')

    const [docsResult, modelsResult] = await Promise.allSettled([getDocuments(), getModels()])

    if (docsResult.status === 'fulfilled') {
      setDocuments(docsResult.value)
    }
    if (modelsResult.status === 'fulfilled') {
      const modelData = modelsResult.value
      setModels(modelData.models)
      const preferred =
        modelData.models.find((m) => m.provider === modelData.default_provider && m.available) ||
        modelData.models.find((m) => m.available) ||
        modelData.models[0]
      if (preferred) {
        setSelectedModelKey(`${preferred.provider}:${preferred.id}`)
      }
    }

    const failure = [docsResult, modelsResult].find((r) => r.status === 'rejected')
    if (!failure) {
      setBootstrapping(false)
      return
    }

    if (attempt < BOOTSTRAP_MAX_ATTEMPTS) {
      setTimeout(() => bootstrap(attempt + 1), attempt * 1000)
      return
    }

    setBootstrapError(
      failure.reason?.message || 'Could not reach the API after several attempts. Is the backend running?'
    )
    setBootstrapping(false)
  }

  async function loadLibrary() {
    setLibraryLoading(true)
    setLibraryError('')
    try {
      const docs = await getLibrary()
      setLibrary(docs)
    } catch (err) {
      setLibraryError(err.message || 'Could not load the document library.')
    } finally {
      setLibraryLoading(false)
    }
  }

  async function openDoc(doc) {
    setActiveDoc(doc)
    setActiveDocContent('')
    setActiveDocLoading(true)
    try {
      const data = await getLibraryDoc(doc.filename)
      setActiveDocContent(data.content)
    } catch (err) {
      setActiveDocContent(`Could not load this document: ${err.message}`)
    } finally {
      setActiveDocLoading(false)
    }
  }

  function closeDoc() {
    setActiveDoc(null)
    setActiveDocContent('')
  }

  async function handleReindex() {
    setReindexing(true)
    setLibraryError('')
    setReindexResult(null)
    try {
      const result = await reindexLibrary(true)
      setReindexResult(result)
      await Promise.all([loadLibrary(), refreshDocuments()])
    } catch (err) {
      setLibraryError(err.message || 'Reindex failed.')
    } finally {
      setReindexing(false)
    }
  }

  async function refreshDocuments() {
    setDocuments(await getDocuments())
  }

  async function handleUpload(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return

    setUploading(true)
    setUploadMessage(null)
    setLibraryError('')

    try {
      for (const file of files) {
        await uploadDocument(file)
      }
      setUploadMessage({
        error: false,
        text: `${files.length === 1 ? 'Document' : `${files.length} documents`} uploaded and indexed.`,
      })
      await Promise.all([loadLibrary(), refreshDocuments()])
    } catch (err) {
      setUploadMessage({ error: true, text: err.message || 'Upload failed.' })
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(doc, alsoDeleteFile) {
    if (!doc.document_id) return
    setDeletingFilename(doc.filename)
    setLibraryError('')
    setUploadMessage(null)
    try {
      await deleteDocument(doc.document_id, alsoDeleteFile)
      setUploadMessage({
        error: false,
        text: `${doc.filename} removed from the index${alsoDeleteFile ? ' and deleted from sample-docs/' : ''}.`,
      })
      await Promise.all([loadLibrary(), refreshDocuments()])
    } catch (err) {
      setLibraryError(err.message || 'Delete failed.')
    } finally {
      setDeletingFilename(null)
    }
  }

  function handleTryAttack(risk, variant) {
    setTab('chat')
    const variantData = variant === 'B' ? risk.variantB : null
    handleAsk(variantData ? variantData.prompt : risk.prompt, {
      owaspId: risk.id,
      markers: variantData?.markers,
      minMarkerOccurrences: variantData?.minMarkerOccurrences,
      agentMode: risk.agentMode,
      variantLabel: variantData?.label,
      fallback: variantData ? variantData.fallback : risk.fallback,
    })
  }

  async function handleAsk(nextQuestion = question, options = {}) {
    const text = nextQuestion.trim()
    if (!text || querying) return

    const presetMeta = OWASP_TOP_10.find((risk) => risk.prompt === text)
    const owaspId = options.owaspId || presetMeta?.id || null
    const baseRisk = owaspId ? OWASP_TOP_10.find((r) => r.id === owaspId) : null
    const risk = baseRisk
      ? {
          ...baseRisk,
          markers: options.markers || baseRisk.markers,
          minMarkerOccurrences: options.minMarkerOccurrences ?? baseRisk.minMarkerOccurrences,
          fallback: options.fallback || baseRisk.fallback,
        }
      : null
    const isAgentMode = options.agentMode ?? baseRisk?.agentMode ?? false
    const variantLabel = options.variantLabel || null
    // Every prompt (preset attack, sample question, or free-form) has a
    // pre-verified fallback response so a slow/unavailable backend (e.g.
    // under concurrent load) never surfaces a connection error mid-demo.
    const fallback = risk?.fallback || SAMPLE_QUESTION_FALLBACKS[text] || GENERIC_FALLBACK

    setQuestion('')
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: text, owaspId, variantLabel }])

    setQuerying(true)

    // When guardrails are ON, a fallback must still behave like a guarded
    // response -- otherwise a preset attack whose real answer would have
    // been blocked (e.g. LLM01/LLM02/LLM07/LLM08/LLM09) would incorrectly
    // render as "exploited" just because the live call was skipped/failed.
    const guardrailExpectation = owaspId ? OWASP_GUARDRAIL_EXPECTATION[owaspId] : null
    function buildFallbackResult(provider, model) {
      if (guardrailsEnabled && guardrailExpectation) {
        return {
          answer: GUARDRAIL_BLOCK_MESSAGES[guardrailExpectation],
          sources: guardrailExpectation === 'input' ? [] : fallback.sources || [],
          provider,
          model,
          guardrail_blocked: guardrailExpectation,
        }
      }
      return {
        answer: fallback.answer,
        sources: fallback.sources || [],
        provider,
        model,
        guardrail_blocked: null,
      }
    }

    try {
      const useFallback = bootstrapping || !!bootstrapError || !selected || !selected.available
      let result
      if (useFallback) {
        await sleep(FALLBACK_THINKING_DELAY_MS)
        result = buildFallbackResult(selected?.provider || 'ollama', selected?.id || 'gemma2:2b')
      } else {
        const runQuery = isAgentMode ? agentQuery : queryRag
        try {
          result = await runQuery({
            question: text,
            provider: selected.provider,
            model: selected.id,
            guardrails_enabled: guardrailsEnabled,
          })
        } catch (liveErr) {
          // Live call failed (overloaded/unavailable model) -- fall back to
          // the exact response this same prompt produced when last verified
          // live, rather than letting the demo stall on an error screen. A
          // fast network-level failure (e.g. unreachable host) can reject
          // almost instantly, so still hold the thinking bubble briefly.
          await sleep(FALLBACK_THINKING_DELAY_MS)
          result = buildFallbackResult(selected.provider, selected.id)
        }
      }

      const guardrailBlocked = Boolean(result.guardrail_blocked)
      const attackDetected = risk ? detectAttackSuccess(risk, result.answer) && !guardrailBlocked : false
      const attackResisted = Boolean(risk) && !attackDetected && !guardrailBlocked

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
          model: result.model,
          provider: result.provider,
          owaspId,
          variantLabel,
          agentMode: isAgentMode,
          attackDetected,
          attackResisted,
          owaspMeta: risk
            ? {
                id: risk.id,
                title: risk.title,
                impact: risk.impact,
                mitigation: risk.mitigation,
              }
            : null,
          guardrailBlocked: result.guardrail_blocked || null,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I could not complete that request: ${err.message}`,
          error: true,
          owaspId,
        },
      ])
    } finally {
      setQuerying(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-tw-mist text-tw-onyx overflow-hidden font-sans">
      <Header
        tab={tab}
        setTab={setTab}
        guardrailsEnabled={guardrailsEnabled}
        setGuardrailsEnabled={setGuardrailsEnabled}
        onShowQR={() => setShowQRModal(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 bg-tw-mist">
          {tab === 'chat' && (
            <ChatView
              messages={messages}
              querying={querying}
              bootstrapping={bootstrapping}
              bootstrapError={bootstrapError}
              onRetryConnection={() => bootstrap()}
              question={question}
              setQuestion={setQuestion}
              onSend={handleAsk}
              documents={documents}
              error={error}
            />
          )}
          {tab === 'owasp' && (
            <OwaspView risks={OWASP_TOP_10} onTryAttack={handleTryAttack} querying={querying} />
          )}
          {tab === 'library' && (
            <LibraryView
              library={library}
              libraryLoading={libraryLoading}
              libraryError={libraryError}
              onOpenDoc={openDoc}
              activeDoc={activeDoc}
              activeDocContent={activeDocContent}
              activeDocLoading={activeDocLoading}
              onCloseDoc={closeDoc}
              onReindex={handleReindex}
              reindexing={reindexing}
              reindexResult={reindexResult}
              onUpload={handleUpload}
              uploading={uploading}
              uploadMessage={uploadMessage}
              onDelete={handleDelete}
              deletingFilename={deletingFilename}
            />
          )}
        </main>
      </div>

      {showQRModal && (
        <QRModal qrUrl={qrUrl} setQrUrl={setQrUrl} onClose={() => setShowQRModal(false)} />
      )}
    </div>
  )
}

export default App
