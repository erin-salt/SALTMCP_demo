// What crossed the boundary to SALT, for the SALT panel. The demo server records
// these as it calls SALT (server/live.ts); simulated mode builds the same shape
// from the fixture.

// One request to SALT's MCP server: the exact arguments and SALT's exact result
// or error. `cache` marks an answer the demo server reused from its own short
// cache instead of asking SALT again. Simulated calls have no `ms`.
export interface SaltCall { tool: string; arguments: Record<string, unknown>; result?: unknown; error?: string; at?: string; ms?: number; cache?: boolean }

// One step of the app's work: a SALT tool it called, or one of Trip Planner's own
// tools (`app`) with whatever SALT calls that tool made. `note` says what the app
// did with SALT's answers.
export interface TraceStep { tool: string; arguments: Record<string, unknown>; app?: boolean; note?: string; error?: string; calls: SaltCall[] }

export const SALT_TOOLS = ['search_venues', 'get_venue', 'check_availability']
