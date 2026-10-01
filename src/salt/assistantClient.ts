import { LiveError } from './liveSalt'
import type { TraceStep } from './trace'

// The live assistant's server endpoints (server/assistant.ts, server/live.ts).
// Claude and SALT keys stay on the server.

export interface LiveVenue { venue_id: string; name: string; address?: string; status: string; reservable: boolean | null; live_availability: boolean }
export interface LiveAnswer { venue_id: string; name: string; availability: string; times: string[]; checked_at: string | null }
export interface LiveAvailability { date: string; time: string; party_size: number; time_zone: string; answers: LiveAnswer[] }
export type AssistantBlock =
  | { type: 'venues'; query: string; venues: LiveVenue[] }
  | { type: 'availability'; request: { venue_ids: string[]; date: string; time: string; party_size: number }; response: LiveAvailability }
  | { type: 'error'; tool: string; message: string }
// `trace`: every tool the assistant used and the SALT calls each made, for the SALT panel.
export interface AssistantReply { text: string; blocks: AssistantBlock[]; known_venue_ids: string[]; trace?: TraceStep[] }
export interface AssistantStatus { configured: boolean; model: string; monthSpent: number; monthlyUsd: number; daySpent: number; dailyUsd: number }
export interface Directory { neighbourhood: string; total: number; complete: boolean; fetched_at?: string; venues: LiveVenue[] }
// SALT's published tool schemas (MCP tools/list).
export interface ContractTool { name: string; description?: string; inputSchema: { properties?: Record<string, { type?: string | string[]; description?: string; anyOf?: { type?: string }[]; items?: { type?: string } }>; required?: string[] }; outputSchema?: unknown }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try { res = await fetch(path, init) } catch { throw new LiveError('Couldn’t reach the demo server') }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new LiveError(body.error ?? 'The assistant couldn’t answer', body.retry_after)
  return body as T
}

export const fetchAssistantStatus = () => request<AssistantStatus>('/api/assistant/status')
export const fetchDirectory = () => request<Directory>('/api/live/directory').then((directory) => {
  if (!Array.isArray(directory?.venues)) throw new LiveError('SALT’s directory isn’t available')
  return directory
})
export const fetchContract = () => request<{ tools: ContractTool[] }>('/api/live/contract')
export const sendChat = (messages: { role: 'user' | 'assistant'; text: string }[], knownVenueIds: string[]) =>
  request<AssistantReply>('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, known_venue_ids: knownVenueIds }),
  })
