import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createLiveHandler } from './server/live.ts'

// In development the live endpoint runs inside the Vite server, reading the
// SALT key from .env.local. It is never bundled into the browser app.
function saltLive(mode: string): Plugin {
  return {
    name: 'salt-live',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), 'SALT_')
      server.middlewares.use(createLiveHandler({ key: env.SALT_MCP_KEY, url: env.SALT_MCP_URL }))
    },
  }
}

export default defineConfig(({ mode }) => ({ plugins: [react(), saltLive(mode)] }))
