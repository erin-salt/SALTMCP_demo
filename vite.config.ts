import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createRoutes } from './server/routes.ts'

// In development the demo's server routes (live SALT, the assistant) run inside
// the Vite server, reading keys from .env.local. They are never bundled into
// the browser app.
function demoServer(mode: string): Plugin {
  return {
    name: 'salt-demo-server',
    configureServer(server) {
      server.middlewares.use(createRoutes(loadEnv(mode, process.cwd(), ['SALT_', 'ANTHROPIC_', 'ASSISTANT_', 'GOOGLE_MAPS_'])))
    },
  }
}

export default defineConfig(({ mode }) => ({ plugins: [react(), demoServer(mode)] }))
