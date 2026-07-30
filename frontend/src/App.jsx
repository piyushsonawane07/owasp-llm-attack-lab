import { useEffect, useState } from 'react'
import Header from './components/Header'
import ChatView from './components/ChatView'
import LibraryView from './components/LibraryView'
import OwaspView from './components/OwaspView'
import QRModal from './components/QRModal'
import { OWASP_TOP_10, detectAttackSuccess } from './constants'
import {
  deleteDocument,
  getDocuments,
  getLibrary,
  getLibraryDoc,
  getModels,
  queryRag,
  reindexLibrary,
  uploadDocument,
} from './api'

// Client-side guardrail: when enabled, obviously malicious injection/jailbreak
// patterns in the user's own text are blocked before ever reaching the model,
// and known-sensitive substrings are redacted from real responses. This is a
// genuine pre/post-processing policy layer, not a simulation of the LLM.
const GUARDRAIL_BLOCK_PATTERNS = [
  'ignore previous instructions',
  'ignore all previous instructions',
  'system prompt',
  'jailbreak',
  'do anything now',
  'master admin',
  'reveal your instructions',
  'without redaction',
]

const REDACTION_MARKERS = [
  'str0ngp@ss!2026',
  'sk-test-internal-4f9a1c7e2b6d4a3f8891',
  '000123456789',
]

function App() {
  const [tab, setTab] = useState('chat')

  const [documents, setDocuments] = useState([])
  const [models, setModels] = useState([])
  const [selectedModelKey, setSelectedModelKey] = useState('')
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [querying, setQuerying] = useState(false)
  const [error, setError] = useState('')
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

  async function bootstrap() {
    try {
      const [docs, modelData] = await Promise.all([getDocuments(), getModels()])
      setDocuments(docs)
      setModels(modelData.models)

      const preferred =
        modelData.models.find((m) => m.provider === modelData.default_provider && m.available) ||
        modelData.models.find((m) => m.available) ||
        modelData.models[0]

      if (preferred) {
        setSelectedModelKey(`${preferred.provider}:${preferred.id}`)
      }
    } catch (err) {
      setError(err.message || 'Could not reach the API. Is the backend running?')
    }
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

  function handleTryAttack(risk) {
    setTab('chat')
    handleAsk(risk.prompt, { owaspId: risk.id })
  }

  async function handleAsk(nextQuestion = question, options = {}) {
    const text = nextQuestion.trim()
    if (!text || querying) return
    if (!selected) {
      setError('Model is not available yet.')
      return
    }
    if (!selected.available) {
      setError(selected.note || 'Selected model is not available.')
      return
    }

    const presetMeta = OWASP_TOP_10.find((risk) => risk.prompt === text)
    const owaspId = options.owaspId || presetMeta?.id || null
    const risk = owaspId ? OWASP_TOP_10.find((r) => r.id === owaspId) : null

    setQuestion('')
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: text, owaspId }])

    if (guardrailsEnabled) {
      const lower = text.toLowerCase()
      const flagged = GUARDRAIL_BLOCK_PATTERNS.some((pattern) => lower.includes(pattern))
      if (flagged) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'This request was blocked before it reached the model because it matched a known prompt-injection pattern.',
            owaspId,
            guardrailBlocked: true,
          },
        ])
        return
      }
    }

    setQuerying(true)

    try {
      const result = await queryRag({
        question: text,
        provider: selected.provider,
        model: selected.id,
      })

      let answer = result.answer
      let redacted = false
      if (guardrailsEnabled) {
        const lowerAnswer = answer.toLowerCase()
        if (REDACTION_MARKERS.some((marker) => lowerAnswer.includes(marker))) {
          for (const marker of REDACTION_MARKERS) {
            const re = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
            answer = answer.replace(re, '[REDACTED BY OUTPUT GUARDRAIL]')
          }
          redacted = true
        }
      }

      const attackDetected = risk ? detectAttackSuccess(risk, result.answer) && !redacted : false
      const attackResisted = Boolean(risk) && !attackDetected && !redacted

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: answer,
          sources: result.sources,
          model: result.model,
          provider: result.provider,
          owaspId,
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
          redacted,
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
