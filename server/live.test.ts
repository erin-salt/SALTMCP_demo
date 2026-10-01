// @vitest-environment node
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HOST_TRIP } from '../src/data/hostProductFixture'
import { DEMO_SAVES, createLiveHandler, type McpLike } from './live'

const VENUES: Record<string, { venue_id: string; name: string; status: string; live_availability: boolean; reservable: boolean | null }> = {
  Krasi: { venue_id: 'ven_krasi', name: 'Krasi', status: 'OPERATING', live_availability: true, reservable: true },
  'Lucca Back Bay': { venue_id: 'ven_lucca', name: 'Lucca Back Bay', status: 'CLOSED_PERMANENTLY', live_availability: false, reservable: null },
}
let server: Server | undefined
afterEach(() => { server?.close(); server = undefined })

async function start(callTool: McpLike['callTool'], key: string | undefined = 'salt_test', now = () => Date.parse('2026-10-01T12:00:00Z')) {
  const handler = createLiveHandler({ key, now, connect: async () => ({ callTool, close: async () => {} }) })
  server = createServer((req, res) => { void handler(req, res) })
  await new Promise<void>((resolve) => server!.listen(0, resolve))
  const base = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`
  return {
    venues: () => fetch(`${base}/api/live/venues`),
    ask: (body: unknown) => fetch(`${base}/api/live/availability`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  }
}

const fakeSalt = () => vi.fn<McpLike['callTool']>(async ({ name, arguments: args }) => {
  if (name === 'search_venues') { const v = VENUES[args.name as string]; return { structuredContent: { total_matches: v ? 1 : 0, venues: v ? [v] : [] } } }
  return { structuredContent: { date: args.date, time: args.time, party_size: args.party_size, time_zone: 'America/New_York', answers: [] } }
})
const question = { venue_ids: ['ven_krasi'], date: '2026-10-17', time: '19:30', party_size: 2 }

describe('live endpoint', () => {
  it('knows exactly the demo’s saved places', () => {
    expect(DEMO_SAVES).toEqual(HOST_TRIP.saved.map((place) => place.name))
  })

  it('links the saves with search_venues', async () => {
    const api = await start(fakeSalt())
    const body = await (await api.venues()).json()
    expect(body.venues.find((v: { save: string }) => v.save === 'Krasi').venue.venue_id).toBe('ven_krasi')
    expect(body.venues.find((v: { save: string }) => v.save === 'Lucca Back Bay').venue.status).toBe('CLOSED_PERMANENTLY')
  })

  it('only answers questions about the demo’s own live venues', async () => {
    const api = await start(fakeSalt())
    expect((await api.ask({ ...question, venue_ids: ['ven_someone_else'] })).status).toBe(400)
    expect((await api.ask({ ...question, venue_ids: ['ven_lucca'] })).status).toBe(400)
    expect((await api.ask({ ...question, date: '2027-06-01' })).status).toBe(400)
    expect((await api.ask({ ...question, time: '7:30pm' })).status).toBe(400)
    expect((await api.ask({ ...question, party_size: 40 })).status).toBe(400)
    expect((await api.ask(question)).status).toBe(200)
  })

  it('reuses an identical answer instead of asking SALT again', async () => {
    const salt = fakeSalt()
    const api = await start(salt)
    await api.ask(question)
    await api.ask(question)
    expect(salt.mock.calls.filter(([call]) => call.name === 'check_availability')).toHaveLength(1)
  })

  it('passes on SALT’s rate limit with when to retry', async () => {
    const salt = fakeSalt()
    salt.mockImplementation(async ({ name, arguments: args }) => name === 'search_venues'
      ? { structuredContent: { venues: [VENUES[args.name as string]].filter(Boolean) } }
      : { isError: true, content: [{ type: 'text', text: 'Too many checks from your key; try again in 23s' }] })
    const api = await start(salt)
    const res = await api.ask(question)
    expect(res.status).toBe(429)
    expect(await res.json()).toMatchObject({ retry_after: 23 })
  })

  it('refuses politely when no key is configured', async () => {
    const api = await start(fakeSalt(), '')
    expect((await api.venues()).status).toBe(503)
  })
})
