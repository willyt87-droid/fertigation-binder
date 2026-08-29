import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))

function rewriteAppRoutes(req: { url?: string }) {
  const [path, query] = (req.url ?? '').split('?')
  const suffix = query ? `?${query}` : ''
  if (path === '/admin' || path.startsWith('/admin/') || path === '/app') {
    req.url = `/app/index.html${suffix}`
    return
  }
  if (path === '/pricing' || path === '/privacy' || path === '/terms') {
    req.url = `${path}/index.html${suffix}`
  }
}

function appFallback() {
  return {
    name: 'app-fallback',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, _res, next) => {
        rewriteAppRoutes(req)
        next()
      })
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use((req, _res, next) => {
        rewriteAppRoutes(req)
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), appFallback()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        app: resolve(root, 'app/index.html'),
        pricing: resolve(root, 'pricing/index.html'),
        privacy: resolve(root, 'privacy/index.html'),
        terms: resolve(root, 'terms/index.html'),
      },
    },
  },
})
