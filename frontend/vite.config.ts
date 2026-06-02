import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: process.env.VERCEL === '1' ? 'dist' : '../public',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
})
