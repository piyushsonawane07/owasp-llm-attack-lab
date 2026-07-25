import { BotMessageSquare, Database } from 'lucide-react'

export default function Header({
  tab,
  setTab,
  models,
  selectedModelKey,
  setSelectedModelKey,
  status,
}) {
  return (
    <>
      <header className="border-b border-tw-wave/20 bg-tw-wave px-3 md:px-5 py-3 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center space-x-3 min-w-0 pr-2">
          <div className="p-2 bg-tw-waveDark border border-tw-sapphire/40 rounded-lg text-tw-pink shrink-0">
            <BotMessageSquare className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="truncate">
            <h1 className="font-serif font-bold text-base md:text-xl text-tw-talc tracking-tight flex items-center gap-2 truncate">
              <span className="truncate">Security Demo</span>
              <span className="hidden sm:inline-block text-[10px] md:text-xs font-sans font-semibold px-2 py-0.5 rounded bg-tw-waveDark text-tw-sapphire border border-tw-sapphire/50 shrink-0">
                Live Demo
              </span>
            </h1>
            <p className="hidden md:block text-xs font-sans font-normal text-tw-mist/80 truncate">
              Security Showcase
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* <label className="hidden md:flex items-center gap-2 bg-tw-waveDark border border-tw-sapphire/30 rounded-lg px-3 py-1.5">
            <span className="text-[11px] font-sans font-semibold text-tw-mist/80">Model</span>
            <select
              value={selectedModelKey}
              onChange={(e) => setSelectedModelKey(e.target.value)}
              className="bg-transparent text-xs font-sans font-semibold text-tw-talc focus:outline-none max-w-[180px]"
            >
              {models.map((m) => (
                <option
                  key={`${m.provider}:${m.id}`}
                  value={`${m.provider}:${m.id}`}
                  className="text-tw-wave"
                >
                  {m.label}
                  {!m.available ? ' — unavailable' : ''}
                </option>
              ))}
            </select>
          </label> */}

          {/* <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tw-waveDark border border-tw-sapphire/20 text-[11px] font-sans font-semibold text-tw-mist/80">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.status === 'ok' ? 'bg-tw-jade' : 'bg-tw-yellow'
              }`}
            />
            {status ? `${status.documents} docs · ${status.chunks} chunks` : 'Connecting…'}
          </div> */}

          <div className="hidden md:flex bg-tw-waveDark p-1 rounded-lg border border-tw-wave text-xs font-sans font-semibold">
            {['chat', 'library'].map((mode) => (
              <button
                key={mode}
                onClick={() => setTab(mode)}
                className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                  tab === mode ? 'bg-tw-pink text-tw-talc' : 'text-tw-mist hover:text-tw-talc'
                }`}
              >
                {mode === 'chat' ? 'Chat' : 'Document Library'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="md:hidden flex bg-tw-wave border-b border-tw-waveDark shrink-0 overflow-x-auto hide-scrollbar font-sans font-semibold">
        {['chat', 'library'].map((mode) => (
          <button
            key={mode}
            onClick={() => setTab(mode)}
            className={`flex-1 min-w-[140px] py-2.5 text-xs transition-colors flex justify-center items-center gap-1.5 ${
              tab === mode ? 'text-tw-talc border-b-2 border-tw-pink bg-tw-waveDark/50' : 'text-tw-mist'
            }`}
          >
            {mode === 'chat' ? 'Chat' : (
              <span className="inline-flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Document Library
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}
