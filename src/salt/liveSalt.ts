import type { AvailabilityRequest, AvailabilityResponse, PlaceId, SaltVenue, SavedPlace } from '../domain/types'

// Live SALT, through the demo's own server endpoint (server/live.ts). The
// browser never sees the access key. Responses are SALT's public MCP contract,
// with times converted to the host's display format.

export class LiveError extends Error {
  retryAfter?: number
  constructor(message: string, retryAfter?: number) { super(message); this.retryAfter = retryAfter }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try { res = await fetch(path, init) } catch { throw new LiveError('Couldn’t reach the demo server') }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new LiveError(body.error ?? 'Live check failed', body.retry_after)
  return body as T
}

// "2026-10-17T21:30:00-04:00" is venue-local with its offset: keep the local
// clock time and show it the way the host does ("9:30 PM").
export const displayTime = (iso: string) => {
  const [hours, minutes] = iso.slice(11, 16).split(':').map(Number)
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}

// `search_venues` for each save, run by the demo server.
export async function fetchLiveVenues(saved: SavedPlace[]): Promise<Record<PlaceId, SaltVenue | undefined>> {
  const { venues } = await request<{ venues: { save: string; venue: SaltVenue | null }[] }>('/api/live/venues')
  const byName = new Map(venues.map(({ save, venue }) => [save, venue ?? undefined]))
  return Object.fromEntries(saved.map((place) => [place.id, byName.get(place.name)]))
}

// `check_availability`, run by the demo server.
export async function fetchLiveAvailability(req: AvailabilityRequest): Promise<AvailabilityResponse> {
  const response = await request<AvailabilityResponse>('/api/live/availability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  return { ...response, answers: response.answers.map((answer) => ({ ...answer, times: answer.times.map(displayTime) })) }
}
