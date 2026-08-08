// Standalone QR generator. Run separately from the app: node scripts/generate-qr.mjs <url>
import QRCode from 'qrcode'

const url = process.argv[2]
if (!url) {
  console.error('Usage: node scripts/generate-qr.mjs <url> [outfile]')
  process.exit(1)
}

const outFile = process.argv[3] || 'qr.png'
await QRCode.toFile(outFile, url, { width: 400, margin: 1 })
console.log(`Saved ${outFile}`)
