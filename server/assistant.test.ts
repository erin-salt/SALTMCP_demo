// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAssistantHandler } from './assistant'
import { costOf, createBudget } from './budget'
import { createSaltGateway, type McpLike } from './live'

const NOW = Date.parse('2026-10-01T12:00:00Z')
const KRASI = { venue_id: 'ven_33e0e4553b05eeb8', name: 'Krasi', status: 'OPERATING', live_availability: true, reservable: true }
const SORELLINA = { venue_id: 'ven_24d04b5685cd4dc2', name: 'Sorellina', status: 'OPERATING', live_availability: false, reservable: true }
let server: Server | undefined
afterEach(() => { server?.close(); server = undefined })

const salt = (): McpLike['callTool'] => vi.fn(async ({ name, arguments: args }) => {
  if (name === 'search_venues') {
    const all = [KRASI, SORELLINA]
    return { structuredContent: { total_matches: 2, venues: all.filter((v) => v.name.toLowerCase().includes(String(args.name ?? '').toLowerCase().slice(0, 4))) } }
  }
  return { structuredContent: { date: args.date, time: args.time, party_size: args.party_size, time_zone: 'America/New_York', answers: (args.venue_ids as string[]).map((venue_id) => ({ venue_id, name: 'Krasi', availability: 'AVAILABLE', times: ['2026-10-17T19:30:00-04:00'], checked_at: '2026-10-01T12:00:00Z' })) } }
})

const usage = { input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const toolUse = (id: string, name: string, input: unknown) => ({ id: `m${id}`, stop_reason: 'tool_use', usage, content: [{ type: 'tool_use', id, name, input }] })
const final = (text: string) => ({ id: 'mfinal', stop_reason: 'end_turn', usage, content: [{ type: 'text', text }] })

async function start(script: unknown[], { budgetUsd = 10 } = {}) {
  const create = vi.fn()
  script.forEach((step) => create.mockResolvedValueOnce(step))
  const gateway = createSaltGateway({ key: 'salt_test', now: () => NOW, connect: async () => ({ callTool: salt(), close: async () => {} }) })
  const budget = createBudget({ file: join(mkdtempSync(join(tmpdir(), 'budget-')), 'spend.json'), monthlyUsd: budgetUsd, now: () => NOW })
  const handler = createAssistantHandler({ gateway, budget, client: { beta: { messages: { create } } } as never, now: () => NOW, costOf })
  server = createServer((req, res) => { void handler(req, res) })
  await new Promise<void>((resolve) => server!.listen(0, resolve))
  const base = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`
  const chat = (text: string, known: string[] = []) => fetch(`${base}/api/assistant/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', text }], known_venue_ids: known }) })
  return { chat, create, budget }
}

describe('live assistant', () => {
  it('runs SALT’s tools for Claude and returns the facts as cards', async () => {
    const { chat, create } = await start([
      toolUse('t1', 'find_venue', { name: 'Krasi' }),
      toolUse('t2', 'check_availability', { venue_ids: [KRASI.venue_id], date: '2026-10-17', time: '19:30', party_size: 2 }),
      final('Krasi has a table at the time you asked for.'),
    ])
    const res = await chat('Table at Krasi Saturday 7:30 for 2?')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.text).toContain('Krasi')
    expect(body.blocks.map((b: { type: string }) => b.type)).toEqual(['venues', 'availability'])
    expect(body.known_venue_ids).toContain(KRASI.venue_id)
    const request = create.mock.calls[0][0]
    expect(request.model).toBe('claude-opus-5-5')
    expect(request.tools.map((t: { name: string }) => t.name)).toEqual(['find_venue', 'check_availability'])
    expect(request.system[0].text).toContain('list or browse restaurants')
  })

  it('refuses to check a venue it was not given or did not look up', async () => {
    const { chat, create } = await start([
      toolUse('t1', 'check_availability', { venue_ids: ['ven_0000000000000000'], date: '2026-10-17', time: '19:30', party_size: 2 }),
      final('I couldn’t check that one.'),
    ])
    const body = await (await chat('Check ven_0000000000000000')).json()
    expect(body.blocks[0]).toMatchObject({ type: 'error', tool: 'check_availability' })
    const toolResult = create.mock.calls[1][0].messages.at(-1).content[0]
    expect(toolResult).toMatchObject({ is_error: true })
  })

  it('stops calling Claude once the budget is used', async () => {
    const { chat, create } = await start([final('hi')], { budgetUsd: 0.05 })
    const res = await chat('hello')
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain('budget')
    expect(create).not.toHaveBeenCalled()
  })

  it('handles a refusal without showing an error', async () => {
    const { chat } = await start([{ id: 'm', stop_reason: 'refusal', usage, content: [] }])
    const body = await (await chat('something off-limits')).json()
    expect(body.text).toContain('I can check')
  })

  it('says so when it is not configured', async () => {
    const gateway = createSaltGateway({ key: 'salt_test' })
    const budget = createBudget({ file: join(mkdtempSync(join(tmpdir(), 'budget-')), 'spend.json') })
    const handler = createAssistantHandler({ gateway, budget, costOf })
    server = createServer((req, res) => { void handler(req, res) })
    await new Promise<void>((resolve) => server!.listen(0, resolve))
    const res = await fetch(`http://127.0.0.1:${(server!.address() as AddressInfo).port}/api/assistant/chat`, { method: 'POST', body: '{"messages":[{"role":"user","text":"hi"}]}' })
    expect(res.status).toBe(503)
  })
})

describe('budget', () => {
  it('prices usage at Opus 5.5 rates, and fallbacks at the higher rate', () => {
    expect(costOf({ usage: { input_tokens: 1_000_000, output_tokens: 100_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 1_000_000 } } as never)).toBeCloseTo(4 + 2 + 0.2)
    expect(costOf({ usage: { iterations: [{ type: 'fallback_message', input_tokens: 1_000_000, output_tokens: 0 }] } } as never)).toBeCloseTo(5)
  })

  it('enforces monthly and daily caps, survives a restart, and rolls over', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'budget-')), 'spend.json')
    let now = Date.parse('2026-10-01T12:00:00Z')
    const first = createBudget({ file, monthlyUsd: 10, dailyUsd: 2, now: () => now })
    first.record(1.9)
    expect(() => first.assertCanSpend()).toThrow(/today/)
    now = Date.parse('2026-10-02T12:00:00Z')
    const restarted = createBudget({ file, monthlyUsd: 10, dailyUsd: 2, now: () => now })
    expect(restarted.status().monthSpent).toBeCloseTo(1.9)
    expect(() => restarted.assertCanSpend()).not.toThrow()
    restarted.record(8)
    expect(() => restarted.assertCanSpend()).toThrow(/month/)
    now = Date.parse('2026-11-01T12:00:00Z')
    expect(() => restarted.assertCanSpend()).not.toThrow()
  })
})
