import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration — just the React plugin, nothing fancy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
