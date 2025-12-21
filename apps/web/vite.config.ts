import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // SSE/Streaming configuration - disable buffering
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // For SSE endpoints, set headers to prevent buffering
            if (req.url?.includes('analyze-stream')) {
              proxyReq.setHeader('Accept', 'text/event-stream');
              proxyReq.setHeader('Cache-Control', 'no-cache');
              proxyReq.setHeader('Connection', 'keep-alive');
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            // Disable buffering for SSE responses
            if (req.url?.includes('analyze-stream')) {
              proxyRes.headers['x-accel-buffering'] = 'no';
              proxyRes.headers['cache-control'] = 'no-cache';
            }
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui-icons': ['lucide-react'],
          'firebase': ['firebase/app', 'firebase/auth'],
        },
      },
    },
  },
})
