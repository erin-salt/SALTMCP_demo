// Hosted server for the shareable demo: serves the built app from dist/ and the
// live endpoint. The SALT key comes from the environment (a Fly secret), never
// from the browser.
//
//   SALT_MCP_KEY=... node server/index.ts
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { createLiveHandler } from './live.ts'

const root = join(import.meta.dirname, '..', 'dist')
const port = Number(process.env.PORT ?? 8080)
const live = createLiveHandler({ key: process.env.SALT_MCP_KEY, url: process.env.SALT_MCP_URL })
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' }

createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0]
  if (path === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"status":"ok"}'); return }
  if (path.startsWith('/api/')) { void live(req, res); return }
  // Static files; anything else falls back to the app shell.
  const file = normalize(join(root, path)).startsWith(root) ? join(root, path) : root
  const target = existsSync(file) && statSync(file).isFile() ? file : join(root, 'index.html')
  res.writeHead(200, {
    'Content-Type': TYPES[extname(target)] ?? 'application/octet-stream',
    'Cache-Control': target.includes(`${join('dist', 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  createReadStream(target).pipe(res)
}).listen(port, () => console.log(`SALT demo on :${port}${process.env.SALT_MCP_KEY ? '' : ' (live mode not configured)'}`))
