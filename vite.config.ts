import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'kaitai-struct/KaitaiStream.js': '/public/kaitai-struct/KaitaiStream.js',
      'kaitai-struct': '/public/kaitai-struct/KaitaiStream.js'
    }
  },
  optimizeDeps: {
    exclude: ['kaitai-struct']
  },
  build: {
    rollupOptions: {
      external: ['iconv-lite', 'fs', 'path']
    }
  }
})