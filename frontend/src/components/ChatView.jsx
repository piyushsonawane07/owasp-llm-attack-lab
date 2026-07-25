import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Bot, Search, FileText, Loader2, Send, Sparkles } from 'lucide-react'

const SAMPLE_QUESTIONS = [
  'What are the key points in the documents?',
  'Summarize the main findings.',
  'What risks or recommendations are mentioned?',
]

export default function ChatView({
  messages,
  querying,
  question,
  setQuestion,
  onSend,
  documents,
  models,
  selectedModelKey,
  setSelectedModelKey,
  selected,
  error,
}) {
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, querying])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-tw-mist">
      {/* <label className="md:hidden flex items-center gap-2 bg-tw-talc border-b border-tw-wave/15 px-3 py-2">
        <span className="text-[11px] font-sans font-semibold text-tw-wave/80 shrink-0">Model</span>
        <select
          value={selectedModelKey}
          onChange={(e) => setSelectedModelKey(e.target.value)}
          className="flex-1 bg-tw-mist rounded-md text-xs font-sans font-semibold text-tw-wave px-2 py-1.5 focus:outline-none"
        >
          {models.map((m) => (
            <option key={`${m.provider}:${m.id}`} value={`${m.provider}:${m.id}`}>
              {m.label}
              {!m.available ? ' — unavailable' : ''}
            </option>
          ))}
        </select>
      </label> */}

      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-8 md:py-14">
            <div className="inline-flex p-3 rounded-2xl bg-tw-wave/5 border border-tw-wave/10 text-tw-pink mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-bold text-xl md:text-2xl text-tw-wave mb-2">
              Ask your documents
            </h2>
            <p className="text-sm text-tw-onyx/70 font-sans mb-5">
              Pick Gemini or Ollama, then ask a question about the pre-loaded knowledge base.
              Retrieved chunks are shown under each answer so the audience can see RAG at work.
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
                  : msg.error
                  ? 'bg-tw-talc border-2 border-tw-pink text-tw-onyx rounded-bl-none'
                  : 'bg-tw-talc border border-tw-wave/20 text-tw-onyx rounded-bl-none'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="mb-2 pb-2 border-b border-tw-wave/10 flex flex-wrap items-center justify-between text-xs text-tw-wave/70 gap-2 font-sans">
                  <span className="font-semibold text-tw-wave flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-tw-sapphire" /> Assistant
                  </span>
                  {/* {msg.provider && (
                    <span className="bg-tw-mist text-tw-wave font-semibold px-2 py-0.5 rounded border border-tw-wave/15 text-[10px] md:text-xs">
                      {msg.provider} · {msg.model}
                    </span>
                  )} */}
                </div>
              )}

              <div className="leading-relaxed break-words">
                {msg.role === 'assistant' ? (
                  <div className="markdown-body markdown-body--compact">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {/* {msg.sources && msg.sources.length > 0 && (
                <details className="mt-3 pt-2 border-t border-tw-wave/10 text-xs font-sans">
                  <summary className="text-tw-wave font-semibold flex items-center gap-1 mb-1 cursor-pointer select-none">
                    <Search className="w-3.5 h-3.5 text-tw-sapphire" /> Sources ({msg.sources.length})
                  </summary>
                  <ol className="mt-2 space-y-2">
                    {msg.sources.map((src, i) => (
                      <li
                        key={`${src.document_id}-${src.chunk_index}-${i}`}
                        className="bg-tw-mist border border-tw-wave/15 rounded-lg p-2.5"
                      >
                        <span className="flex items-center gap-1.5 font-semibold text-tw-wave text-[11px] mb-1">
                          <FileText className="w-3 h-3 text-tw-sapphire" />
                          {src.filename}
                          <em className="ml-auto font-normal text-tw-wave/60 not-italic">
                            score {src.score.toFixed(3)}
                          </em>
                        </span>
                        <p className="text-tw-onyx/75 leading-relaxed">{src.text}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )} */}
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

      {selected && !selected.available && selected.note && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-tw-yellow/10 border border-tw-yellow/40 text-[#8a5b06] text-xs font-sans font-semibold">
          {selected.note}
        </div>
      )}

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
              documents.length ? 'Ask a question about your documents…' : 'No documents indexed yet…'
            }
            disabled={querying}
            className="flex-1 bg-tw-talc border border-tw-wave/30 rounded-lg px-4 py-2.5 text-sm font-sans text-tw-onyx placeholder-tw-wave/50 focus:outline-none focus:border-tw-pink focus:ring-1 focus:ring-tw-pink transition disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={querying || !question.trim()}
            className="bg-tw-pink hover:bg-tw-pink/90 disabled:opacity-50 text-tw-talc font-sans font-semibold px-4 md:px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-1.5 shadow-md shrink-0"
          >
            <span className="hidden sm:inline">Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
