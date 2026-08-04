import { ShieldAlert, PlayCircle, ArrowRight, FileText } from 'lucide-react'

export default function OwaspView({ risks, onTryAttack, querying }) {
  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5 pb-safe font-sans bg-tw-mist">
      <div>
        <h2 className="text-xl md:text-2xl font-serif font-bold text-tw-wave mb-1">
          OWASP Top 10 for LLMs
        </h2>
        {/* <p className="text-xs md:text-sm text-tw-onyx/70">
          Click any risk to run a real question — grounded in the documents already indexed from{' '}
          <code className="bg-tw-talc border border-tw-wave/15 rounded px-1.5 py-0.5">sample-docs/</code>{' '}
          — through the live RAG pipeline in Chat. Nothing here is scripted or simulated.
        </p> */}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {risks.map((risk) => (
          <div key={risk.id} className="bg-tw-talc border border-tw-wave/20 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-tw-sapphire/40 bg-tw-mist text-tw-wave text-[10px] font-bold">
                  <ShieldAlert className="w-3.5 h-3.5 text-tw-pink" />
                  {risk.id}
                </div>
                <h3 className="mt-2 text-sm md:text-base font-semibold text-tw-wave">{risk.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => onTryAttack(risk)}
                disabled={querying}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-tw-pink hover:bg-tw-pink/90 disabled:opacity-50 text-tw-talc transition shadow"
              >
                <PlayCircle className="w-4 h-4" />
                Try Attack
              </button>
            </div>

            <p className="text-xs text-tw-onyx/85 leading-relaxed">{risk.shortDesc}</p>

            {/* <div className="text-[11px] text-tw-onyx/70 bg-tw-mist border border-tw-wave/15 rounded-lg px-2.5 py-2">
              <span className="font-semibold text-tw-wave">Prompt sent:</span>{' '}
              <span className="italic">“{risk.prompt}”</span>
            </div> */}

            {/* <p className="text-[11px] text-tw-wave bg-tw-mist border border-tw-wave/15 rounded-lg px-2.5 py-2">
              <span className="font-semibold">Mitigation:</span> {risk.mitigation}
            </p> */}

            {/* <div className="text-[11px] text-tw-wave/80 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-tw-sapphire shrink-0" />
              Source: {risk.sourceDoc}
            </div> */}
            {/* <div className="text-[11px] text-tw-wave/80 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-tw-sapphire shrink-0" />
              Runs live against Ollama (temperature 0) — real retrieval, real generation.
            </div> */}
          </div>
        ))}
      </div>
    </div>
  )
}
