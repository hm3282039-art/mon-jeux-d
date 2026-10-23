import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildPage = process.env.BUILD_PAGE

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // Static hosting is more reliable when each page has an autonomous bundle.
    emptyOutDir: buildPage !== 'heroes',
    rollupOptions: {
      input: buildPage === 'index'
        ? ['index.html']
        : buildPage === 'heroes'
          ? ['heroes.html']
          : ['index.html', 'heroes.html'],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
})
