import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // PORT env (when set) wins so preview harnesses can assign a free port; defaults to 5173.
  server: { port: Number(process.env.PORT) || 5173 },
  build: {
    rollupOptions: {
      // Two HTML entries over the SAME app bundle: worldcup.html carries competition-specific
      // OG/Twitter meta (Vercel rewrites /worldcup → /worldcup.html so crawlers unfurl it).
      input: { main: 'index.html', worldcup: 'worldcup.html' },
    },
  },
})
