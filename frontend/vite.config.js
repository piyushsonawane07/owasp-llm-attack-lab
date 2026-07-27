import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
    },
    // Audience members join over LAN/ngrok using whatever hostname or IP
    // the QR code encodes, so don't restrict which Host headers are
    // accepted (this is a local demo app, not a public deployment).
    allowedHosts: true,
  },
})
