import { useState, type ReactNode } from 'react'
import type { AvailabilityResponse, AvailabilityState, SaltVenue } from '../../domain/types'
import { fetchContract, type ContractTool } from '../../salt/assistantClient'
import { useCallLog, type LogEntry } from '../../salt/callLog'
import type { SaltCall, TraceStep } from '../../salt/trace'
import { SaltMark } from './DemoShell'

const STATES: AvailabilityState[] = ['AVAILABLE', 'ALTERNATIVE_TIMES', 'NONE_REPORTED', 'UNKNOWN', 'NOT_SUPPORTED']

// A developer's view of what crosses the boundary: one entry per question the app
// asked, holding every real call to SALT's public MCP tools with the exact
// arguments and result. Trip Planner's own tools are labelled as the app's. It
// shows only what any customer sees in SALT's published schema, never how SALT
// establishes its answers.
export function SaltRail({ connected, source, extra }: { connected: boolean; source: 'simulated' | 'live'; extra?: ReactNode }) {
  const [latest, ...earlier] = useCallLog()
  const [expanded, setExpanded] = useState(false)
  const check = latest && lastCheck(latest)
  return <>
    <aside className={`rail${connected ? '' : ' is-off'}`} id="salt-rail" aria-labelledby="rail-title">
      <header className="rail-head"><h2 id="rail-title"><SaltMark /></h2><span className={source === 'live' ? 'is-live' : undefined}>{source === 'live' ? '● Live responses' : 'Simulated responses'}</span></header>
      {connected && extra}
      {!connected && <p className="rail-off"><span className="rail-pulse" aria-hidden="true" />Not connected. The app is running without SALT.</p>}
      <div className="rail-log" aria-live="polite" hidden={!connected}>
        {latest && <Entry key={latest.id} entry={latest} latest />}
        {expanded && earlier.map((entry) => <Entry key={entry.id} entry={entry} />)}
        {earlier.length > 0 && <button className="rail-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide earlier calls' : `Show earlier calls (${earlier.length})`}</button>}
      </div>
      <details className="rail-owners">
        <summary>Who owns what</summary>
        <dl>
          <dt>The app knows</dt><dd>Trip, itinerary and party</dd><dd>Saved places and where they came from</dd>
          <dt className="is-salt">SALT returns</dt><dd>Each venue’s status, and whether it can be checked live</dd><dd>On request: times offered for a party, or why there are none</dd>
          <dt>The app decides</dt><dd>Which venue_id each save is, linked once by name with search_venues</dd><dd>When to ask, what to show, timing notes</dd><dd>Handoff to a reservation provider</dd>
        </dl>
      </details>
      <Contract />
    </aside>
    {connected && latest && <a className="rail-ticker" href="#salt-rail" aria-hidden="true" tabIndex={-1}>
      <SaltMark small />
      <span className="ticker-label">{latest.label}</span>
      {check ? <Strip response={check} /> : latest.pending ? <span className="rail-spinner" /> : null}
    </a>}
  </>
}

const calls = (entry: LogEntry) => entry.steps.flatMap((step) => step.calls)
const isAvailability = (call: SaltCall) => call.tool === 'check_availability' && !!call.result
function lastCheck(entry: LogEntry) {
  const call = calls(entry).filter(isAvailability).at(-1)
  return call?.result as AvailabilityResponse | undefined
}

function Strip({ response }: { response: AvailabilityResponse }) {
  return <span className="rail-strip">{response.answers.map((answer) => <i key={answer.venue_id} className={answer.availability} title={`${answer.name}: ${answer.availability}`} />)}</span>
}

// The latest entry is open; earlier ones are one line each until opened.
function Entry({ entry, latest = false }: { entry: LogEntry; latest?: boolean }) {
  const [open, setOpen] = useState(latest)
  const made = calls(entry)
  const check = lastCheck(entry)
  if (!open) return <article className="rail-entry is-compact" aria-label={entry.label}>
    <button className="rail-line" aria-expanded="false" onClick={() => setOpen(true)}>
      <span className="rail-label">{entry.label}</span>
      <span className="rail-line-sum">
        {entry.pending ? <span className="rail-spinner" aria-hidden="true" /> : entry.error || made.some((c) => c.error) ? <span className="rail-error">error</span> : check ? <Strip response={check} /> : null}
        <span>{made.length} {made.length === 1 ? 'call' : 'calls'}</span>
      </span>
    </button>
  </article>
  return <article className="rail-entry" aria-label={entry.label}>
    <p className="rail-entry-head"><span className="rail-label">{entry.label}</span>
      {!latest && <button className="rail-toggle is-close" aria-expanded="true" onClick={() => setOpen(false)}>close</button>}
    </p>
    {group(entry.steps).map((steps, i) => steps.length >= 3 ? <Batch key={i} steps={steps} /> : steps.map((step, j) => <Step key={`${i}-${j}`} step={step} pending={!!entry.pending} />))}
    {entry.pending && !entry.steps.length && <p className="rail-return"><span className="rail-spinner" aria-hidden="true" />waiting</p>}
    {!entry.pending && !entry.error && !made.length && !entry.steps.some((s) => s.error) && <p className="rail-note">No calls to SALT for this answer</p>}
    {entry.error && <p className="rail-return rail-error">{entry.error}</p>}
  </article>
}

// Runs of the same SALT tool called directly (such as linking ten saves) read as one batch.
function group(steps: TraceStep[]) {
  const groups: TraceStep[][] = []
  for (const step of steps) {
    const last = groups.at(-1)
    if (last && !step.app && !last[0].app && last[0].tool === step.tool) last.push(step)
    else groups.push([step])
  }
  return groups
}

function Step({ step, pending }: { step: TraceStep; pending: boolean }) {
  const failedCall = step.calls.some((call) => call.error)
  if (step.app) return <div className="rail-app">
    <p className="rail-call is-app"><span className="rail-tag">Trip Planner tool</span><code>{step.tool}</code></p>
    <Args args={step.arguments} />
    {step.note && <p className="rail-note">{step.note}</p>}
    {step.calls.map((call, i) => <Call key={i} call={call} />)}
    {step.error && !failedCall && <p className="rail-return rail-error">← error · {step.error}</p>}
  </div>
  if (step.calls.length) return <>{step.calls.map((call, i) => <Call key={i} call={call} />)}</>
  // Not made (yet): what the app is sending, or why it never reached SALT.
  return <div className="rail-callbox">
    <p className="rail-call"><code>{step.tool}</code></p>
    <Args args={step.arguments} />
    {step.error ? <p className="rail-return rail-error">← not sent to SALT · {step.error}</p>
      : pending ? <p className="rail-return"><span className="rail-spinner" aria-hidden="true" />waiting</p> : null}
  </div>
}

const timing = (call: SaltCall) => call.cache ? 'demo cache' : call.ms === undefined ? 'simulated' : `${call.ms} ms`

function Call({ call }: { call: SaltCall }) {
  return <div className="rail-callbox">
    <p className="rail-call"><code>{call.tool}</code><span title={call.cache ? 'The demo server reused an identical answer from the last 90 seconds instead of asking SALT again' : undefined}>{timing(call)}</span></p>
    <Args args={call.arguments} />
    {call.error ? <p className="rail-return rail-error">← {call.error}</p> : <Result call={call} />}
    <Json call={call} />
  </div>
}

const show = (value: unknown) => typeof value === 'string' ? `"${value}"` : Array.isArray(value) ? `[${value.length}]` : String(value)

function Args({ args }: { args: Record<string, unknown> }) {
  return <>{Object.entries(args).map(([name, value]) => <p key={name} className="rail-arg"><span>{name}</span><span title={Array.isArray(value) ? value.join('\n') : undefined}>{show(value)}</span></p>)}</>
}

const ago = (iso: string) => {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000))
  return seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)} min ago`
}

function Result({ call }: { call: SaltCall }) {
  const [open, setOpen] = useState(false)
  if (call.tool === 'check_availability') {
    const response = call.result as AvailabilityResponse
    const counts = STATES.map((state) => [state, response.answers.filter((a) => a.availability === state).length] as const).filter(([, n]) => n > 0)
    const checkedAt = response.answers.find((a) => a.checked_at)?.checked_at
    return <>
      <p className="rail-return">← <Strip response={response} /></p>
      <ul className="rail-states">{counts.map(([state, n]) => <li key={state} className={state}><span><i aria-hidden="true" />{state}</span>{n}</li>)}</ul>
      <p className="rail-arg"><span>time_zone</span><span>"{response.time_zone}"</span></p>
      {checkedAt && <p className="rail-arg"><span>checked_at</span><span>"{checkedAt}"<em>{ago(checkedAt)}</em></span></p>}
      <button className="rail-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>answers</button>
      {open && <ul className="rail-answers">{response.answers.map((a) => <li key={a.venue_id}>
        <span>{a.name}</span><span className="rail-state">{a.availability}</span>{a.times.length > 0 && <span className="rail-times">{a.times.join(' ')}</span>}
      </li>)}</ul>}
    </>
  }
  if (call.tool === 'search_venues') {
    const { total_matches, venues } = call.result as { total_matches: number; venues: SaltVenue[] }
    return <>
      <p className="rail-return">← total_matches {total_matches}</p>
      <ul className="rail-answers">{venues.map((v) => <li key={v.venue_id}><span>{v.name}</span><span className="rail-state">{v.status}</span></li>)}</ul>
    </>
  }
  return <p className="rail-return">← ok</p>
}

// The exact payloads: the tools/call arguments sent, and SALT's structuredContent back.
function Json({ call }: { call: SaltCall }) {
  const [tab, setTab] = useState<'request' | 'response'>()
  const [copied, setCopied] = useState(false)
  const body = tab === 'request' ? { name: call.tool, arguments: call.arguments }
    : call.error ? { isError: true, error: call.error } : call.result
  const text = JSON.stringify(body, null, 2)
  const copy = () => navigator.clipboard?.writeText(text).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) }, () => {})
  return <div className="rail-json">
    <div className="rail-tabs" role="group" aria-label={`${call.tool} JSON`}>
      {(['request', 'response'] as const).map((name) => <button key={name} aria-pressed={tab === name} onClick={() => setTab(tab === name ? undefined : name)}>{name === 'request' ? 'Request' : 'Response'}</button>)}
      {tab && <button className="rail-copy" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>}
    </div>
    {tab && <pre aria-label={`${call.tool} ${tab}`}>{text}</pre>}
  </div>
}

function Batch({ steps }: { steps: TraceStep[] }) {
  const made = steps.flatMap((step) => step.calls)
  const ms = made.every((call) => call.ms !== undefined) ? Math.max(0, ...made.map((call) => call.ms!)) : undefined
  const [open, setOpen] = useState<number>()
  return <div className="rail-callbox">
    <p className="rail-call"><code>{steps[0].tool}</code><span>× {steps.length}{ms !== undefined ? ` · slowest ${ms} ms` : made.length && made.every((c) => c.cache) ? ' · demo cache' : ''}</span></p>
    <ul className="rail-batch">{steps.map((step, i) => {
      const call = step.calls[0]
      const found = (call?.result as { venues?: SaltVenue[] } | undefined)?.venues?.[0]
      return <li key={i}>
        <button aria-expanded={open === i} onClick={() => setOpen(open === i ? undefined : i)}>
          <span>{show(step.arguments.name ?? step.tool)}</span>
          <span className={found && found.status !== 'OPERATING' ? 'rail-state is-flag' : 'rail-state'}>{call?.error ? 'error' : !call ? 'waiting' : found ? found.status : 'no match'}</span>
        </button>
        {open === i && call && <Call call={call} />}
      </li>
    })}</ul>
  </div>
}

// SALT's published tool schemas, read from its MCP server (tools/list).
function Contract() {
  const [state, setState] = useState<{ tools: ContractTool[] } | 'loading' | 'error'>()
  const load = (open: boolean) => {
    if (!open || (state && state !== 'error')) return
    setState('loading')
    fetchContract().then(setState, () => setState('error'))
  }
  return <details className="rail-owners rail-contract" onToggle={(event) => load(event.currentTarget.open)}>
    <summary>Contract · SALT’s tool schemas</summary>
    {state === 'loading' && <p className="rail-note"><span className="rail-spinner" aria-hidden="true" />Reading tools/list…</p>}
    {state === 'error' && <p className="rail-note">Couldn’t read SALT’s schemas just now.</p>}
    {typeof state === 'object' && <>
      {state.tools.map((tool) => <ToolSchema key={tool.name} tool={tool} />)}
      <p className="rail-note">Read live from SALT’s MCP server (tools/list), the same schemas any key holder sees.</p>
    </>}
  </details>
}

const typeOf = (p: NonNullable<ContractTool['inputSchema']['properties']>[string]) =>
  p.type === 'array' ? `${p.items?.type ?? 'any'}[]` : [p.type ?? p.anyOf?.map((t) => t.type)].flat().filter(Boolean).join(' | ')

function ToolSchema({ tool }: { tool: ContractTool }) {
  const [open, setOpen] = useState(false)
  const required = new Set(tool.inputSchema.required ?? [])
  return <div className="rail-tool">
    <p className="rail-call"><code>{tool.name}</code></p>
    {tool.description && <p className="rail-tool-desc">{tool.description}</p>}
    {Object.entries(tool.inputSchema.properties ?? {}).map(([name, p]) => <p key={name} className="rail-arg"><span>{name}{required.has(name) ? '' : '?'}</span><span>{typeOf(p)}</span></p>)}
    <button className="rail-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>schema</button>
    {open && <pre>{JSON.stringify({ inputSchema: tool.inputSchema, outputSchema: tool.outputSchema }, null, 2)}</pre>}
  </div>
}
