// Spend guard for the live assistant. Every Claude response's usage is priced
// and added up; once the month's or the day's cap is reached the assistant
// stops calling Claude until the period rolls over. Totals live in a small
// JSON file so they survive restarts (on Fly, a mounted volume).
//
// This is a safety net inside the app. Set a spend limit on the Anthropic
// workspace too: that is the cap Anthropic itself enforces.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { LiveError } from './live.ts'

// USD per million tokens. Claude Opus 5.5: $4 in, $20 out, cache writes at
// 1.25x input, cache reads $0.20. Fallback attempts are priced at Claude Opus
// 4.8 rates ($5 / $25), the most a default fallback costs, so the guard errs high.
const RATES = {
  primary: { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  fallback: { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
}
type Usage = { input_tokens?: number | null; output_tokens?: number | null; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null }

const price = (usage: Usage, rates: typeof RATES.primary) => (
  (usage.input_tokens ?? 0) * rates.input
  + (usage.output_tokens ?? 0) * rates.output
  + (usage.cache_creation_input_tokens ?? 0) * rates.cacheWrite
  + (usage.cache_read_input_tokens ?? 0) * rates.cacheRead
) / 1_000_000

// `usage.iterations` is the per-attempt source of truth when a fallback ran;
// otherwise the top-level usage covers the whole response.
export function costOf(message: Pick<Anthropic.Beta.BetaMessage, 'usage'>) {
  const iterations = message.usage.iterations
  if (!iterations?.length) return price(message.usage, RATES.primary)
  return iterations.reduce((sum, entry) => sum + price(entry as Usage, entry.type === 'fallback_message' ? RATES.fallback : RATES.primary), 0)
}

interface State { month: string; monthSpent: number; day: string; daySpent: number; replies: number }
interface Options { file: string; monthlyUsd?: number; dailyUsd?: number; now?: () => number }

export type Budget = ReturnType<typeof createBudget>

export function createBudget({ file, monthlyUsd = 10, dailyUsd = 2, now = Date.now }: Options) {
  const today = () => new Date(now()).toISOString().slice(0, 10)
  let state: State = { month: today().slice(0, 7), monthSpent: 0, day: today(), daySpent: 0, replies: 0 }
  try { state = { ...state, ...JSON.parse(readFileSync(file, 'utf8')) } } catch { /* first run */ }

  const roll = () => {
    const day = today()
    if (state.month !== day.slice(0, 7)) state = { ...state, month: day.slice(0, 7), monthSpent: 0, replies: 0 }
    if (state.day !== day) state = { ...state, day, daySpent: 0 }
  }
  const save = () => {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(`${file}.tmp`, JSON.stringify(state))
    renameSync(`${file}.tmp`, file)
  }

  return {
    // Refuse before calling Claude if the next reply could cross a cap.
    assertCanSpend(estimateUsd = 0.15) {
      roll()
      if (state.monthSpent + estimateUsd > monthlyUsd) throw new LiveError(429, 'The live assistant has used this month’s budget')
      if (state.daySpent + estimateUsd > dailyUsd) throw new LiveError(429, 'The live assistant has used today’s budget')
    },
    record(usd: number, reply = false) {
      roll()
      state.monthSpent += usd
      state.daySpent += usd
      if (reply) state.replies += 1
      save()
    },
    status() { roll(); return { ...state, monthlyUsd, dailyUsd } },
  }
}
