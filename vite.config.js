import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // PORT env (when set) wins so preview harnesses can assign a free port; defaults to 5173.
  server: { port: Number(process.env.PORT) || 5173 },
})
