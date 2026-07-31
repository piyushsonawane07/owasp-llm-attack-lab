import { Database, ShieldCheck, ShieldOff, ShieldAlert, QrCode } from 'lucide-react'

const TABS = [
  { key: 'chat', label: 'Chat' },
  { key: 'owasp', label: 'OWASP' },
  { key: 'library', label: 'Library' },
]

export default function Header({ tab, setTab, guardrailsEnabled, setGuardrailsEnabled, onShowQR }) {
  return (
    <>
      <header className="border-b border-tw-wave/20 bg-tw-wave px-3 md:px-5 py-3 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center space-x-3 min-w-0 pr-2">
          <div className="p-2 bg-tw-waveDark border border-tw-sapphire/40 rounded-lg text-tw-pink shrink-0">
            <ShieldAlert className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="truncate">
            <h1 className="font-serif font-bold text-base md:text-xl text-tw-talc tracking-tight flex items-center gap-2 truncate">
              <span className="truncate">Security Sandbox</span>
              <span className="hidden sm:inline-block text-[10px] md:text-xs font-sans font-semibold px-2 py-0.5 rounded bg-tw-waveDark text-tw-sapphire border border-tw-sapphire/50 shrink-0">
                Live Demo
              </span>
            </h1>
            <p className="hidden md:block text-xs font-sans font-normal text-tw-mist/80 truncate">
              OWASP Top 10 for LLMs · RAG Vulnerability Showcase
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setGuardrailsEnabled(!guardrailsEnabled)}
            title="Toggle NeMo Guardrails"
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-semibold flex items-center gap-1.5 transition border ${
              guardrailsEnabled
                ? 'bg-tw-jade text-tw-talc border-tw-jade'
                : 'bg-tw-waveDark border-tw-sapphire/30 text-tw-mist hover:text-tw-talc'
            }`}
          >
            {guardrailsEnabled ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
            <span className="hidden sm:inline">Guardrails: {guardrailsEnabled ? 'ACTIVE' : 'OFF'}</span>
            <span className="sm:hidden">{guardrailsEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onShowQR}
            className="px-3 py-1.5 bg-tw-pink hover:bg-tw-pink/90 text-tw-talc rounded-lg text-xs font-sans font-semibold flex items-center gap-1.5 shadow-md transition"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Audience QR</span>
            <span className="sm:hidden">QR</span>
          </button>

          <div className="hidden md:flex bg-tw-waveDark p-1 rounded-lg border border-tw-wave text-xs font-sans font-semibold">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                  tab === key ? 'bg-tw-pink text-tw-talc' : 'text-tw-mist hover:text-tw-talc'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="md:hidden flex bg-tw-wave border-b border-tw-waveDark shrink-0 overflow-x-auto hide-scrollbar font-sans font-semibold">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 min-w-[100px] py-2.5 text-xs transition-colors flex justify-center items-center gap-1.5 ${
              tab === key ? 'text-tw-talc border-b-2 border-tw-pink bg-tw-waveDark/50' : 'text-tw-mist'
            }`}
          >
            {key === 'library' ? (
              <span className="inline-flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> {label}
              </span>
            ) : (
              label
            )}
          </button>
        ))}
      </div>
    </>
  )
}
