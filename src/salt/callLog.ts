import { useSyncExternalStore } from 'react'
import type { SaltCall, TraceStep } from './trace'

// The SALT panel's log: one entry per question the app put to SALT, newest
// first, holding the calls that actually crossed the boundary (./trace.ts).
// Several parts of the app ask SALT (meal cards, venue cards, the assistant),
// so each reports here rather than through props.
export interface LogEntry { id: string; label: string; source: 'simulated' | 'live'; steps: TraceStep[]; pending?: boolean; error?: string }

let entries: LogEntry[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

// Calls made directly by the app, one step each.
export const direct = (calls: SaltCall[]): TraceStep[] => calls.map((call) => ({ tool: call.tool, arguments: call.arguments, calls: [call] }))

export const callLog = {
  // A question on its way. `steps` are the calls the app is about to make.
  start(label: string, source: LogEntry['source'], steps: TraceStep[] = []) {
    const id = `call-${++seq}`
    entries = [{ id, label, source, steps, pending: true }, ...entries]
    emit()
    return id
  },
  // What happened. Ignored once the log has been cleared, so a late answer from
  // an earlier run never lands.
  settle(id: string, outcome: { steps?: TraceStep[]; error?: string }) {
    if (!entries.some((entry) => entry.id === id)) return
    entries = entries.map((entry) => entry.id === id ? { ...entry, ...outcome, pending: false } : entry)
    emit()
  },
  add(entry: Omit<LogEntry, 'id'>) {
    entries = [{ ...entry, id: `call-${++seq}` }, ...entries]
    emit()
  },
  clear() {
    entries = []
    emit()
  },
}

export const useCallLog = () => useSyncExternalStore((listener) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}, () => entries)
