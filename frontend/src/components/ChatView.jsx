import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Bot,
  AlertTriangle,
  Search,
  FileText,
  Loader2,
  Zap,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { PRESET_ATTACKS } from '../constants'

// Collapses multiple retrieved chunks from the same document into a single
// chip (e.g. 4 chunks from doc1.md -> one "doc1.md ×4" chip) instead of
// showing the same filename repeated once per chunk.
function uniqueSources(sources) {
  const byFile = new Map()
  for (const src of sources) {
    const key = src.document_id || src.filename
    if (!byFile.has(key)) {
      byFile.set(key, { ...src, chunks: [] })
    }
    byFile.get(key).chunks.push(src)
  }
  return Array.from(byFile.values())
}

// Verified-clean control questions: each answers correctly from a single
// document with no planted vulnerability triggered, so the audience sees
// the RAG pipeline working normally before the OWASP attacks below.
const SAMPLE_QUESTIONS = [
  'How many days of casual leave and sick leave do employees get per year?',
  'What mandatory trainings do new hires need to complete?',
  'What is CloudSync used for?',
]

export default function ChatView({
  messages,
  querying,
  question,
  setQuestion,
  onSend,
  documents,
  error,
}) {
  const chatEndRef = useRef(null)
  const [showAllPresets, setShowAllPresets] = useState(false)
  const mobilePresetLimit = 4
  const visiblePresets = useMemo(
    () => (showAllPresets ? PRESET_ATTACKS : PRESET_ATTACKS.slice(0, mobilePresetLimit)),
    [showAllPresets]
  )

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, querying])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-tw-mist">
      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-8 md:py-14">
            <div className="inline-flex p-3 rounded-2xl bg-tw-wave/5 border border-tw-wave/10 text-tw-pink mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-bold text-xl md:text-2xl text-tw-wave mb-2">
              Ask your documents
            </h2>
            <p className="text-sm text-tw-onyx/70 font-sans mb-4">
              This is a real RAG pipeline (FastAPI + Ollama) answering from the
              documents in <code className="bg-tw-talc border border-tw-wave/15 rounded px-1 py-0.5 text-xs">sample-docs/</code>.
              Nothing here is scripted.
            </p>
            <div className="max-w-xl mx-auto mb-6 grid grid-cols-3 gap-2 text-left text-[11px] font-sans">
              <div className="p-2.5 rounded-lg bg-tw-talc border border-tw-wave/15">
                <span className="font-bold text-tw-wave">1. Ask normally</span>
                <p className="text-tw-onyx/60 mt-0.5">Try a clean question to see the pipeline behave correctly.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-tw-talc border border-tw-wave/15">
                <span className="font-bold text-tw-wave">2. Run an attack</span>
                <p className="text-tw-onyx/60 mt-0.5">Fire an OWASP demo below or from the OWASP tab.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-tw-talc border border-tw-wave/15">
                <span className="font-bold text-tw-wave">3. Read the verdict</span>
                <p className="text-tw-onyx/60 mt-0.5">Each attack reply shows if it was exploited or resisted, and why.</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-tw-wave/80 mb-2 text-left max-w-xl mx-auto">
              Start with a clean question:
            </p>
            <div className="grid sm:grid-cols-3 gap-2 text-left">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onSend(q)}
                  disabled={!documents.length || querying}
                  className="p-2.5 bg-tw-talc hover:bg-tw-wave/5 border border-tw-wave/15 hover:border-tw-sapphire rounded-lg text-xs font-sans text-tw-wave transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[90%] md:max-w-2xl rounded-xl p-3.5 md:p-4 text-sm font-sans shadow-sm ${
                msg.role === 'user'
                  ? 'bg-tw-wave text-tw-talc rounded-br-none'
                  : msg.attackDetected
                  ? 'bg-tw-talc text-tw-onyx rounded-bl-none'
                  : msg.attackResisted
                  ? 'bg-tw-talc border-2 border-tw-jade text-tw-onyx rounded-bl-none'
                  : msg.error
                  ? 'bg-tw-talc text-tw-onyx rounded-bl-none'
                  : 'bg-tw-talc border border-tw-wave/20 text-tw-onyx rounded-bl-none'
              }`}
            >
              {msg.role === 'user' && msg.owaspId && (
                <span className="inline-block mb-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-tw-talc/15 text-tw-talc border border-tw-talc/30">
                  {msg.owaspId} attack
                </span>
              )}

              {msg.role === 'assistant' && (
                <div className="mb-2 pb-2 border-b border-tw-wave/10 flex flex-wrap items-center justify-between text-xs text-tw-wave/70 gap-2 font-sans">
                  <span className="font-semibold text-tw-wave flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-tw-sapphire" /> Assistant
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* {msg.owaspId && (
                      <span className="bg-tw-mist text-tw-wave font-bold px-2 py-0.5 rounded border border-tw-wave/25 text-[10px] md:text-xs">
                        {msg.owaspId}
                      </span>
                    )} */}
                    {/* {msg.attackDetected && (
                      <span className="bg-tw-pink/10 text-tw-pink font-bold px-2 py-0.5 rounded border border-tw-pink/40 flex items-center gap-1 text-[10px] md:text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" /> VULNERABILITY EXPLOITED
                      </span>
                    )}
                    {msg.attackResisted && (
                      <span className="bg-tw-jade/10 text-[#2f5b3a] font-bold px-2 py-0.5 rounded border border-tw-jade/40 flex items-center gap-1 text-[10px] md:text-xs">
                        <ShieldCheck className="w-3.5 h-3.5" /> ATTACK RESISTED
                      </span>
                    )} */}
                  </div>
                </div>
              )}

              {/* {msg.guardrailBlocked === 'input' && (
                <div className="mb-2 text-[11px] rounded-md px-2 py-1 bg-tw-jade/10 border border-tw-jade/40 text-[#2f5b3a] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Guardrail Alert: request blocked before it reached the model.
                </div>
              )}
              {msg.guardrailBlocked === 'output' && (
                <div className="mb-2 text-[11px] rounded-md px-2 py-1 bg-tw-jade/10 border border-tw-jade/40 text-[#2f5b3a] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Guardrail Alert: response blocked after generation.
                </div>
              )} */}

              <div className="leading-relaxed break-words">
                {msg.role === 'assistant' ? (
                  <div className="markdown-body markdown-body--compact">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {/* {msg.owaspMeta && (msg.attackDetected || msg.attackResisted) && (
                <div
                  className={`mt-3 rounded-lg p-2.5 text-[11px] leading-relaxed border ${
                    msg.attackDetected
                      ? 'bg-tw-pink/5 border-tw-pink/30'
                      : 'bg-tw-jade/5 border-tw-jade/30'
                  }`}
                > */}
                  {/* <div className="flex items-center gap-1.5 font-bold text-tw-wave mb-1">
                    {msg.attackDetected ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-tw-pink" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2f5b3a]" />
                    )}
                    {msg.owaspMeta.id} · {msg.owaspMeta.title} —{' '}
                    {msg.attackDetected ? 'Exploited' : 'Resisted this time'}
                  </div> */}
                  {/* <p className="text-tw-onyx/75">
                    <span className="font-semibold text-tw-wave">
                      {msg.attackDetected ? 'What happened: ' : 'Why it matters: '}
                    </span>
                    {msg.owaspMeta.impact}
                  </p> */}
                  {/* {msg.attackDetected && (
                    <p className="text-tw-onyx/75 mt-1">
                      <span className="font-semibold text-tw-wave">Mitigation: </span>
                      {msg.owaspMeta.mitigation}
                    </p>
                  )} */}
                  {/* {msg.attackResisted && (
                    <p className="text-tw-onyx/60 mt-1 italic">
                      The planted payload is still in the source below — exploitation is
                      retrieval- and phrasing-dependent, so a different wording may still trigger it.
                    </p>
                  )} */}
                {/* </div>
              )} */}

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-tw-wave/10 text-xs font-sans">
                  <span className="text-tw-wave font-semibold flex items-center gap-1 mb-1.5">
                    <Search className="w-3.5 h-3.5 text-tw-sapphire" /> Retrieved Context:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueSources(msg.sources).map((src) => (
                      <span
                        key={src.document_id || src.filename}
                        title={msg.guardrailBlocked ? undefined : src.chunks.map((c) => c.text).join('\n\n')}
                        className="bg-tw-mist border border-tw-wave/20 text-tw-wave px-2 py-0.5 rounded text-[11px] flex items-center gap-1 truncate max-w-full font-medium"
                      >
                        <FileText className="w-3 h-3 text-tw-sapphire shrink-0" /> {src.filename}
                        {src.chunks.length > 1 && (
                          <span className="text-tw-wave/50 font-normal">×{src.chunks.length}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {querying && (
          <div className="flex flex-col items-start">
            <div className="max-w-[90%] md:max-w-2xl rounded-xl rounded-bl-none p-3.5 md:p-4 text-sm font-sans shadow-sm bg-tw-talc border border-tw-wave/20">
              <div className="mb-2 pb-2 border-b border-tw-wave/10 flex items-center gap-1.5 text-xs font-semibold text-tw-wave">
                <Bot className="w-4 h-4 text-tw-sapphire" />
                Assistant
                <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin text-tw-pink" />
              </div>
              <div className="flex items-center gap-2 text-tw-wave/80">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="text-xs italic ml-1">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {error && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-tw-pink/10 border border-tw-pink/40 text-[#9d3145] text-xs font-sans font-semibold">
          {error}
        </div>
      )}

      <div className="p-3 bg-tw-talc border-t border-tw-wave/15">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-sans font-semibold text-tw-wave flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-tw-yellow" /> Quick OWASP Attack Demos:
          </p>
          {PRESET_ATTACKS.length > mobilePresetLimit && (
            <button
              type="button"
              onClick={() => setShowAllPresets((prev) => !prev)}
              className="md:hidden inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-tw-wave/20 text-tw-wave bg-tw-mist"
            >
              {showAllPresets ? 'Less' : 'More'}
              {showAllPresets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:flex md:overflow-x-auto gap-2 pb-1 md:pb-2 md:-mb-2 md:snap-x md:hide-scrollbar">
          {visiblePresets.map((attack, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSend(attack.prompt, { owaspId: attack.owaspId })}
              disabled={querying}
              className="shrink-0 md:w-64 md:flex-1 text-left p-2.5 bg-tw-mist hover:bg-tw-wave/10 border border-tw-wave/20 hover:border-tw-wave rounded-lg text-xs font-sans transition group md:snap-start disabled:opacity-50"
            >
              <span className="font-semibold text-tw-wave group-hover:text-tw-pink block truncate">
                <span className="inline-flex mr-1.5 px-1.5 py-0.5 rounded border border-tw-sapphire/40 bg-tw-talc text-[10px] text-tw-wave align-middle">
                  {attack.owaspId}
                </span>
                {attack.name}
              </span>
              <span className="text-[10px] text-tw-onyx/70 block truncate mt-0.5 whitespace-normal line-clamp-2">
                {attack.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 bg-tw-talc border-t border-tw-wave/15 pb-safe mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSend()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              documents.length
                ? 'Type a message or run a prompt injection attack…'
                : 'No documents indexed yet…'
            }
            disabled={querying}
            className="flex-1 bg-tw-talc border border-tw-wave/30 rounded-lg px-4 py-2.5 text-sm font-sans text-tw-onyx placeholder-tw-wave/50 focus:outline-none focus:border-tw-pink focus:ring-1 focus:ring-tw-pink transition disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={querying || !question.trim()}
            className="bg-tw-pink hover:bg-tw-pink/90 disabled:opacity-50 text-tw-talc font-sans font-semibold px-4 md:px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-1.5 shadow-md shrink-0"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}