// The demo's only live connection to SALT. It holds the access key server-side
// and answers just the demo's own questions: the user's saved places and SALT's
// Back Bay directory, within a sensible date, time and party range. It is deliberately not a general SALT gateway, because a
// shared link means anyone can trigger it.
//
// Used by the Vite dev server (vite.config.ts) and the hosted server (index.ts).
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

// The demo's saved places, as the host would hold them. Must match
// src/data/hostProductFixture.ts (a test checks this).
export const DEMO_SAVES = ['Krasi', 'Piattini', "Abe & Louie's", 'Lucca Back Bay', 'Saltie Girl', 'Zuma Boston', 'The Banks', 'Asta', 'La Padrona', "Stephanie's on Newbury"]
export const NEIGHBOURHOOD = 'back_bay'

const VENUES_TTL_MS = 10 * 60_000
const DIRECTORY_TTL_MS = 60 * 60_000
const SEARCH_LIMIT = 50 // SALT's maximum per search_venues call
const ANSWER_TTL_MS = 90_000 // matches SALT's own reuse window
const VISITOR_LIMIT = 20 // live requests per visitor per minute
const MAX_DAYS_AHEAD = 60

export interface McpLike { callTool: (call: { name: string; arguments: Record<string, unknown> }) => Promise<{ isError?: boolean; structuredContent?: unknown; content?: unknown }>; close: () => Promise<void> }
export interface Venue { venue_id: string; name: string; address?: string; neighbourhood?: string; status: string; status_confidence?: string | null; live_availability: boolean; reservable: boolean | null }
export interface Directory { neighbourhood: string; total: number; complete: boolean; venues: Venue[] }
export interface Question { venue_ids?: unknown; date?: unknown; time?: unknown; party_size?: unknown }
interface Options { key?: string; url?: string; now?: () => number; connect?: () => Promise<McpLike> }

export class LiveError extends Error {
  status: number
  retryAfter?: number
  constructor(status: number, message: string, retryAfter?: number) { super(message); this.status = status; this.retryAfter = retryAfter }
}

const fold = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'")

export type SaltGateway = ReturnType<typeof createSaltGateway>

// One connection, one cache and one set of rules for every live SALT call.
export function createSaltGateway({ key, url = 'https://salt-mcp.fly.dev/mcp', now = Date.now, connect }: Options) {
  let client: Promise<McpLike> | undefined
  let saves: { at: number; value: Promise<{ save: string; venue: Venue | null }[]> } | undefined
  let directory: { at: number; value: Promise<Directory> } | undefined
  const answers = new Map<string, { at: number; value: Promise<unknown> }>()
  const searches = new Map<string, { at: number; value: Promise<Venue[]> }>()

  const mcp = () => client ??= (connect ?? (async () => {
    const c = new Client({ name: 'salt-demo', version: '1.0.0' })
    await c.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { Authorization: `Bearer ${key}` } } }))
    return c as unknown as McpLike
  }))().catch((error) => { client = undefined; throw toLiveError(error) })

  const call = async (name: string, args: Record<string, unknown>) => {
    if (!key) throw new LiveError(503, 'Live mode is not configured on this server')
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

  const cached = <T>(store: Map<string, { at: number; value: Promise<T> }>, cacheKey: string, ttl: number, load: () => Promise<T>) => {
    const hit = store.get(cacheKey)
    if (hit && now() - hit.at < ttl) return hit.value
    const value = load()
    value.catch(() => store.delete(cacheKey))
    store.set(cacheKey, { at: now(), value })
    return value
  }

  // `search_venues` by name, within Back Bay only. Never a browse: a name is required.
  const searchByName = (name: string) => {
    const query = name.trim()
    if (query.length < 2 || query.length > 80) throw new LiveError(400, 'name must be 2 to 80 characters')
    return cached(searches, fold(query), VENUES_TTL_MS, async () => {
      const found = await call('search_venues', { name: query, neighbourhood: NEIGHBOURHOOD, include_closed: true, limit: 5 }) as { venues: Venue[] }
      return found.venues
    })
  }

  // The user's saves, linked the way a host links them: one name lookup each.
  const loadSaves = () => {
    if (!saves || now() - saves.at > VENUES_TTL_MS) {
      const value = Promise.all(DEMO_SAVES.map(async (save) => {
        const found = await searchByName(save)
        return { save, venue: found.find((v) => fold(v.name).includes(fold(save))) ?? found[0] ?? null }
      }))
      value.catch(() => { saves = undefined })
      saves = { at: now(), value }
    }
    return saves.value
  }

  // Every venue SALT serves in Back Bay, closed ones included. search_venues
  // returns at most 50 and has no paging, so the directory is gathered by name
  // fragments (rarest characters first) until the count matches SALT's total.
  // Searches are not rate-limited by SALT; the result is cached for an hour.
  const loadDirectory = () => {
    if (!directory || now() - directory.at > DIRECTORY_TTL_MS) {
      const value = (async (): Promise<Directory> => {
        const search = (name?: string) => call('search_venues', { ...(name ? { name } : {}), neighbourhood: NEIGHBOURHOOD, include_closed: true, limit: SEARCH_LIMIT }) as Promise<{ total_matches: number; venues: Venue[] }>
        const first = await search()
        const found = new Map(first.venues.map((v) => [v.venue_id, v]))
        const pending = [...'qxzjkvwyfbg0123456789phmudclnsrotiae']
        while (found.size < first.total_matches && pending.length) {
          const batch = pending.splice(0, 6)
          const results = await Promise.all(batch.map(async (fragment) => ({ fragment, result: await search(fragment) })))
          for (const { fragment, result } of results) {
            result.venues.forEach((v) => found.set(v.venue_id, v))
            if (result.total_matches > SEARCH_LIMIT) pending.push(...[...'aeiounrstlcdhm'].map((c) => fragment + c), ...[...'aeiounrstl'].map((c) => c + fragment))
          }
        }
        const venues = [...found.values()].sort((a, b) => fold(a.name).localeCompare(fold(b.name)))
        return { neighbourhood: 'Back Bay, Boston', total: first.total_matches, complete: venues.length >= first.total_matches, venues }
      })()
      value.catch(() => { directory = undefined })
      directory = { at: now(), value }
    }
    return directory.value
  }

  // The saves, plus any venue SALT can check live in its Back Bay directory.
  const checkableIds = async () => {
    const ids = await savedLiveIds()
    try { (await loadDirectory()).venues.filter((v) => v.live_availability).forEach((v) => ids.add(v.venue_id)) } catch { /* the saves still work */ }
    return ids
  }

  const savedLiveIds = async () => new Set((await loadSaves()).filter(({ venue }) => venue?.live_availability).map(({ venue }) => venue!.venue_id))

  // `check_availability`, only for venues the caller is allowed to ask about.
  const check = async (question: Question, allowed: Set<string>) => {
    const { date, time, party_size } = question
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new LiveError(400, 'date must be YYYY-MM-DD')
    const days = (Date.parse(`${date}T12:00:00Z`) - now()) / 86_400_000
    if (!(days > -1 && days < MAX_DAYS_AHEAD)) throw new LiveError(400, `date must be within the next ${MAX_DAYS_AHEAD} days`)
    if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new LiveError(400, 'time must be HH:MM')
    if (!Number.isInteger(party_size) || (party_size as number) < 1 || (party_size as number) > 8) throw new LiveError(400, 'party_size must be 1 to 8')
    const ids = Array.isArray(question.venue_ids) ? question.venue_ids : []
    if (!ids.length || ids.length > 10 || ids.some((id) => typeof id !== 'string' || !allowed.has(id))) throw new LiveError(400, 'venue_ids must be places found for this conversation')
    return cached(answers, JSON.stringify([[...ids].sort(), date, time, party_size]), ANSWER_TTL_MS,
      () => call('check_availability', { venue_ids: ids, date, time, party_size }))
  }

  return { configured: !!key, searchByName, loadSaves, loadDirectory, savedLiveIds, checkableIds, check }
}

// Per-visitor limits, shared by every route that reaches SALT or Claude.
export function createThrottle(limit: number, windowMs: number, now = Date.now) {
  const visitors = new Map<string, number[]>()
  return (visitor: string, message = 'Too many live checks from this browser') => {
    const recent = (visitors.get(visitor) ?? []).filter((t) => now() - t < windowMs)
    if (recent.length >= limit) throw new LiveError(429, message, Math.ceil((windowMs - (now() - recent[0])) / 1000))
    visitors.set(visitor, [...recent, now()])
  }
}

export const visitorOf = (req: IncomingMessage) => String(req.headers['fly-client-ip'] ?? req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'local').split(',')[0].trim()

// HTTP routes: link the saves, ask about them, and SALT's Back Bay directory
// for the assistant's map.
export function createLiveHandler(options: Options & { gateway?: SaltGateway }) {
  const gateway = options.gateway ?? createSaltGateway(options)
  const throttle = createThrottle(VISITOR_LIMIT, 60_000, options.now)

  return async function handle(req: IncomingMessage, res: ServerResponse, next?: () => void) {
    const path = (req.url ?? '').split('?')[0]
    if (!path.startsWith('/api/live/')) return next ? next() : send(res, 404, { error: 'Not found' })
    try {
      if (!gateway.configured) throw new LiveError(503, 'Live mode is not configured on this server')
      throttle(visitorOf(req))
      if (req.method === 'GET' && path === '/api/live/venues') return send(res, 200, { venues: await gateway.loadSaves() })
      if (req.method === 'GET' && path === '/api/live/directory') return send(res, 200, await gateway.loadDirectory())
      if (req.method === 'POST' && path === '/api/live/availability') return send(res, 200, await gateway.check(await readJson(req), await gateway.checkableIds()))
      throw new LiveError(404, 'Not found')
    } catch (error) {
      return sendError(res, error)
    }
  }
}

export function toLiveError(error: unknown): LiveError {
  if (error instanceof LiveError) return error
  const message = String((error as Error)?.message ?? error)
  if (/401|access key/i.test(message)) return new LiveError(503, 'Live mode is not configured correctly (SALT rejected the key)')
  return new LiveError(503, 'Couldn’t reach SALT')
}

export async function readJson(req: IncomingMessage, limit = 10_000) {
  let raw = ''
  for await (const chunk of req) { raw += chunk; if (raw.length > limit) throw new LiveError(413, 'Request too large') }
  try { return JSON.parse(raw || '{}') } catch { throw new LiveError(400, 'Invalid JSON') }
}

export function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

export function sendError(res: ServerResponse, error: unknown) {
  const e = error instanceof LiveError ? error : toLiveError(error)
  return send(res, e.status, { error: e.message, retry_after: e.retryAfter }, e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {})
}
