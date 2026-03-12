import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // AWS SDK uses process.env checks in some places
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Provide node built-ins as no-ops in the browser
      'node:stream': 'node:stream',
    },
  },
  optimizeDeps: {
    // Pre-bundle AWS SDK so it works in the browser
    include: [
      '@aws-sdk/client-s3',
      '@aws-sdk/s3-request-presigner',
    ],
  },
})
