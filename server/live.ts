// The demo's only live connection to SALT. It holds the access key server-side
// and answers just the demo's own questions: the ten saved places, within a
// sensible date, time and party range. It is deliberately not a general SALT
// gateway, because a shared link means anyone can trigger it.
//
// Used by the Vite dev server (vite.config.ts) and the hosted server (index.ts).
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

// The demo's saved places, as the host would hold them. Must match
// src/data/hostProductFixture.ts (a test checks this).
export const DEMO_SAVES = ['Krasi', 'Piattini', "Abe & Louie's", 'Lucca Back Bay', 'Saltie Girl', 'Zuma Boston', 'The Banks', 'Asta', 'La Padrona', "Stephanie's on Newbury"]

const VENUES_TTL_MS = 10 * 60_000
const ANSWER_TTL_MS = 90_000 // matches SALT's own reuse window
const VISITOR_LIMIT = 20 // live requests per visitor per minute
const MAX_DAYS_AHEAD = 60

interface Options { key?: string; url?: string; now?: () => number; connect?: () => Promise<McpLike> }
export interface McpLike { callTool: (call: { name: string; arguments: Record<string, unknown> }) => Promise<{ isError?: boolean; structuredContent?: unknown; content?: unknown }>; close: () => Promise<void> }
interface Venue { venue_id: string; name: string; status: string; live_availability: boolean; reservable: boolean | null }

class LiveError extends Error {
  status: number
  retryAfter?: number
  constructor(status: number, message: string, retryAfter?: number) { super(message); this.status = status; this.retryAfter = retryAfter }
}

const fold = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'")

export function createLiveHandler({ key, url = 'https://salt-mcp.fly.dev/mcp', now = Date.now, connect }: Options) {
  let client: Promise<McpLike> | undefined
  let venues: { at: number; value: Promise<{ save: string; venue: Venue | null }[]> } | undefined
  const answers = new Map<string, { at: number; value: Promise<unknown> }>()
  const visitors = new Map<string, number[]>()

  const mcp = () => client ??= (connect ?? (async () => {
    const c = new Client({ name: 'salt-demo', version: '1.0.0' })
    await c.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { Authorization: `Bearer ${key}` } } }))
    return c as unknown as McpLike
  }))().catch((error) => { client = undefined; throw toLiveError(error) })

  const call = async (name: string, args: Record<string, unknown>) => {
    let result
    try { result = await (await mcp()).callTool({ name, arguments: args }) } catch (error) { client = undefined; throw toLiveError(error) }
    if (result.isError) {
      const text = JSON.stringify(result.content ?? '')
      const wait = text.match(/try again in (\d+)s/)
      if (wait) throw new LiveError(429, 'SALT is limiting checks from this demo', Number(wait[1]))
      throw new LiveError(502, 'SALT could not complete this check')
    }
    return result.structuredContent
  }

  // search_venues, once per save, the way a host links a save to SALT.
  const loadVenues = () => {
    if (!venues || now() - venues.at > VENUES_TTL_MS) {
      const value = Promise.all(DEMO_SAVES.map(async (save) => {
        const found = await call('search_venues', { name: save, include_closed: true, limit: 5 }) as { venues: Venue[] }
        return { save, venue: found.venues.find((v) => fold(v.name).includes(fold(save))) ?? found.venues[0] ?? null }
      }))
      value.catch(() => { venues = undefined })
      venues = { at: now(), value }
    }
    return venues.value
  }

  const throttle = (visitor: string) => {
    const recent = (visitors.get(visitor) ?? []).filter((t) => now() - t < 60_000)
    if (recent.length >= VISITOR_LIMIT) throw new LiveError(429, 'Too many live checks from this browser', Math.ceil((60_000 - (now() - recent[0])) / 1000))
    visitors.set(visitor, [...recent, now()])
  }

  const availability = async (body: { venue_ids?: unknown; date?: unknown; time?: unknown; party_size?: unknown }) => {
    const { date, time, party_size } = body
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new LiveError(400, 'date must be YYYY-MM-DD')
    const days = (Date.parse(`${date}T12:00:00Z`) - now()) / 86_400_000
    if (!(days > -1 && days < MAX_DAYS_AHEAD)) throw new LiveError(400, `date must be within the next ${MAX_DAYS_AHEAD} days`)
    if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new LiveError(400, 'time must be HH:MM')
    if (!Number.isInteger(party_size) || (party_size as number) < 1 || (party_size as number) > 8) throw new LiveError(400, 'party_size must be 1 to 8')
    const allowed = new Set((await loadVenues()).filter(({ venue }) => venue?.live_availability).map(({ venue }) => venue!.venue_id))
    const ids = Array.isArray(body.venue_ids) ? body.venue_ids : []
    if (!ids.length || ids.length > 10 || ids.some((id) => typeof id !== 'string' || !allowed.has(id))) throw new LiveError(400, 'venue_ids must be the demo’s saved places')
    const cacheKey = JSON.stringify([[...ids].sort(), date, time, party_size])
    const hit = answers.get(cacheKey)
    if (hit && now() - hit.at < ANSWER_TTL_MS) return hit.value
    const value = call('check_availability', { venue_ids: ids, date, time, party_size })
    value.catch(() => answers.delete(cacheKey))
    answers.set(cacheKey, { at: now(), value })
    return value
  }

  return async function handle(req: IncomingMessage, res: ServerResponse, next?: () => void) {
    const path = (req.url ?? '').split('?')[0]
    if (!path.startsWith('/api/live/')) return next ? next() : notFound(res)
    try {
      if (!key) throw new LiveError(503, 'Live mode is not configured on this server')
      throttle(String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'local').split(',')[0].trim())
      if (req.method === 'GET' && path === '/api/live/venues') return send(res, 200, { venues: await loadVenues() })
      if (req.method === 'POST' && path === '/api/live/availability') return send(res, 200, await availability(await readJson(req)))
      throw new LiveError(404, 'Not found')
    } catch (error) {
      const e = error instanceof LiveError ? error : toLiveError(error)
      return send(res, e.status, { error: e.message, retry_after: e.retryAfter }, e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {})
    }
  }
}

function toLiveError(error: unknown): LiveError {
  if (error instanceof LiveError) return error
  const message = String((error as Error)?.message ?? error)
  if (/401|access key/i.test(message)) return new LiveError(503, 'Live mode is not configured correctly (SALT rejected the key)')
  return new LiveError(503, 'Couldn’t reach SALT')
}

async function readJson(req: IncomingMessage) {
  let raw = ''
  for await (const chunk of req) { raw += chunk; if (raw.length > 10_000) throw new LiveError(413, 'Request too large') }
  try { return JSON.parse(raw || '{}') } catch { throw new LiveError(400, 'Invalid JSON') }
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

function notFound(res: ServerResponse) { send(res, 404, { error: 'Not found' }) }
