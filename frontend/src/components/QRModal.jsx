import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { X } from 'lucide-react'

export default function QRModal({ qrUrl, setQrUrl, onClose }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && qrUrl.trim()) {
      QRCode.toCanvas(canvasRef.current, qrUrl.trim(), { width: 200, margin: 1 }, (err) => {
        if (err) console.error('QR generation error:', err)
      })
    }
  }, [qrUrl])

  return (
    <div className="fixed inset-0 bg-tw-onyx/60 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-tw-talc border border-tw-wave/30 p-5 md:p-6 rounded-2xl max-w-[95vw] md:max-w-md w-full text-center space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto text-tw-onyx">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 text-tw-wave/60 hover:text-tw-pink p-1 rounded transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-xl font-serif font-bold text-tw-wave mb-1">Scan to Join Live Demo</h2>
          <p className="text-xs text-tw-onyx/70">
            Audience members can scan this QR code to access the sandbox from mobile devices.
          </p>
        </div>

        <div className="text-left space-y-1">
          <label className="text-[11px] font-semibold text-tw-wave">Target URL:</label>
          <input
            type="text"
            value={qrUrl}
            onChange={(e) => setQrUrl(e.target.value)}
            placeholder="https://your-rag-demo.example.com"
            className="w-full bg-tw-talc border border-tw-wave/30 rounded-lg px-3 py-1.5 text-xs text-tw-wave font-mono focus:outline-none focus:border-tw-pink"
          />
        </div>

        <div className="flex justify-center p-3 bg-tw-talc border border-tw-wave/20 rounded-xl shadow inline-block mx-auto">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  )
}
