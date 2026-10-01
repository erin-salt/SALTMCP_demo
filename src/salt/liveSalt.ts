import type { AvailabilityRequest, AvailabilityResponse, PlaceId, SaltVenue, SavedPlace } from '../domain/types'
import { callLog, direct } from './callLog'
import type { SaltCall, TraceStep } from './trace'

// Live SALT, through the demo's own server endpoint (server/live.ts). The
// browser never sees the access key. Responses are SALT's public MCP contract,
// with times converted to the host's display format. Every call is reported to
// the SALT panel's log, exactly as the server made it.

export class LiveError extends Error {
  retryAfter?: number
  // The SALT calls made before the failure, if any.
  trace?: SaltCall[]
  constructor(message: string, retryAfter?: number, trace?: SaltCall[]) { super(message); this.retryAfter = retryAfter; this.trace = trace }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try { res = await fetch(path, init) } catch { throw new LiveError('Couldn’t reach the demo server') }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new LiveError(body.error ?? 'Live check failed', body.retry_after, body.trace)
  return body as T
}

// How a failed question reads in the SALT panel: SALT's own error on the call
// that failed, or a plain note that nothing reached SALT.
export const failedOutcome = (error: unknown, steps: (calls: SaltCall[]) => TraceStep[]) => {
  const trace = error instanceof LiveError ? error.trace ?? [] : []
  const message = error instanceof Error ? error.message : 'Live check failed'
  return trace.length ? { steps: steps(trace) } : { error: `Not sent to SALT · ${message}` }
}

// "2026-10-17T21:30:00-04:00" is venue-local with its offset: keep the local
// clock time and show it the way the host does ("9:30 PM").
export const displayTime = (iso: string) => {
  const [hours, minutes] = iso.slice(11, 16).split(':').map(Number)
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}

export const forDisplay = (response: AvailabilityResponse): AvailabilityResponse => ({ ...response, answers: response.answers.map((answer) => ({ ...answer, times: answer.times.map(displayTime) })) })

// `search_venues` for each save, run by the demo server.
export async function fetchLiveVenues(saved: SavedPlace[]): Promise<Record<PlaceId, SaltVenue | undefined>> {
  const id = callLog.start(`Link ${saved.length} saves`, 'live')
  try {
    const { venues, trace } = await request<{ venues: { save: string; venue: SaltVenue | null }[]; trace?: SaltCall[] }>('/api/live/venues')
    callLog.settle(id, { steps: direct(trace ?? []) })
    const byName = new Map(venues.map(({ save, venue }) => [save, venue ?? undefined]))
    return Object.fromEntries(saved.map((place) => [place.id, byName.get(place.name)]))
  } catch (error) {
    callLog.settle(id, failedOutcome(error, direct))
    throw error
  }
}

// `check_availability`, run by the demo server. `label` names the question in the SALT panel.
export async function fetchLiveAvailability(req: AvailabilityRequest, label: string): Promise<AvailabilityResponse> {
  const step = (calls: SaltCall[]): TraceStep[] => [{ tool: 'check_availability', arguments: { ...req }, calls }]
  const id = callLog.start(label, 'live', step([]))
  try {
    const { trace, ...response } = await request<AvailabilityResponse & { trace?: SaltCall[] }>('/api/live/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    callLog.settle(id, { steps: step(trace ?? []) })
    return forDisplay(response)
  } catch (error) {
    callLog.settle(id, failedOutcome(error, step))
    throw error
  }
}
