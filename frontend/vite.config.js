import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) yêu cầu manualChunks là function
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('/react/')
            ) return 'vendor-react';
          }
        }
      }
    }
  }
})
