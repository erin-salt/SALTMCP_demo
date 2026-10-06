import { useState, type ReactNode } from 'react'
import type { SaltMode } from '../host/TripPlannerApp'
import { ProductTeams } from './ProductTeams'
import { SaltRail } from './SaltRail'

export type UseCase = 'planner' | 'assistant'
export type DataSource = 'simulated' | 'live'
export type LiveStatus = 'idle' | 'loading' | 'ready' | 'error'
// What the current view says SALT changed, from the demo's own data.
export interface Impact { saves: number; withTables?: number; closed?: number }

interface Props {
  useCase: UseCase
  mode: SaltMode
  source: DataSource
  liveStatus: LiveStatus
  liveError?: string
  highlight: boolean
  prompt: boolean
  impact: Impact
  // From SALT's own directory, once loaded: every venue it serves, and how many it can check live.
  coverage?: { total: number; live?: number }
  onUseCase: (useCase: UseCase) => void
  onMode: (mode: SaltMode) => void
  onSource: (source: DataSource) => void
  onHighlight: () => void
  onReset: () => void
  // Extra content at the top of the SALT panel (the assistant's closed-venue demo).
  railExtra?: ReactNode
  children: ReactNode
}

const SALT_HOST = 'salt-mcp.fly.dev'

const USE_CASES: { id: UseCase; label: string; short: string }[] = [
  { id: 'planner', label: 'Trip planner app', short: 'Planner' },
  { id: 'assistant', label: 'AI assistant', short: 'Assistant' },
]

export function DemoShell({ useCase, mode, source, liveStatus, liveError, highlight, prompt, impact, coverage, onUseCase, onMode, onSource, onHighlight, onReset, railExtra, children }: Props) {
  const [teams, setTeams] = useState(false)
  return <div className={`shell is-${useCase}`}>
    <header className="shell-bar">
      <div className="shell-id">
        <SaltMark />
        <div className="use-cases" role="tablist" aria-label="Use case">
          {USE_CASES.map((item, index) => <button key={item.id} role="tab" aria-label={item.label} aria-selected={useCase === item.id} onClick={() => onUseCase(item.id)}>
            <span className="use-case-no" aria-hidden="true">0{index + 1}</span><span className="wide-only">{item.label}</span><span className="narrow-only">{item.short}</span>
          </button>)}
        </div>
      </div>
      <div className="shell-tools">
        <span className="source-label wide-only" aria-hidden="true">Data · optional</span>
        <div className={`source-switch is-${source}`} role="group" aria-label="SALT responses">
          <button aria-pressed={source === 'simulated'} title="Optional. SALT’s real tools and fields, with answers from a fixed sample. The walkthrough works either way." onClick={() => onSource('simulated')}>Simulated</button>
          <button aria-pressed={source === 'live'} title="Optional. Real requests to SALT’s MCP server. The walkthrough works either way." onClick={() => onSource('live')}><i aria-hidden="true" />Live</button>
        </div>
        <button className="shell-teams" aria-expanded={teams} onClick={() => setTeams(true)} aria-label="For product teams">For<span className="wide-only"> product</span> teams</button>
        <button className="shell-reset" onClick={onReset}>Reset</button>
      </div>
    </header>
    <div className="shell-controls">
      <div className="mode-switch" role="group" aria-label="SALT">
        <button aria-pressed={mode === 'without'} onClick={() => onMode('without')}>Without SALT</button>
        <button aria-pressed={mode === 'with'} onClick={() => onMode('with')}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" /></svg>With SALT</button>
      </div>
      {prompt && <span className="shell-prompt" aria-hidden="true">Switch to compare</span>}
      <button className="highlight-switch" role="switch" aria-checked={highlight && mode === 'with'} disabled={mode !== 'with'} onClick={onHighlight}>
        <span className="switch-track" aria-hidden="true"><span /></span>Highlight what SALT does
      </button>
      {source === 'live' && (mode === 'with' || liveStatus === 'error') && <span className={`live-status is-${liveStatus}`} role="status">
        {liveStatus === 'loading' ? 'Connecting to SALT…' : liveStatus === 'error' ? <>{liveError ?? 'Couldn’t reach SALT'} · <button onClick={() => onSource('live')}>Try again</button></> : <>Live from SALT’s MCP server · {SALT_HOST}</>}
      </span>}
      <span className="coverage-chip" title="SALT currently serves Boston’s Back Bay neighbourhood">Coverage · Back Bay, Boston{coverage && <> · {coverage.total} venues{coverage.live !== undefined && <> · {coverage.live} checkable live</>}</>}</span>
      <p className="impact" aria-live="polite">
        {mode === 'without' || impact.withTables === undefined
          ? <><b>{impact.saves}</b> saved places to check by hand</>
          : <><b>1</b> request<span>·</span><b>{impact.withTables}</b> with tables{impact.closed ? <><span>·</span><b>{impact.closed}</b> closed caught</> : null}</>}
      </p>
    </div>
    <div className="shell-stage">
      <div className="host-window">{children}</div>
      <SaltRail connected={mode === 'with'} source={source} extra={railExtra} />
    </div>
    {teams && <ProductTeams onClose={() => setTeams(false)} />}
  </div>
}

export function SaltMark({ small = false }: { small?: boolean }) {
  return <span className={`salt-mark${small ? ' small' : ''}`}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" /></svg>SALT</span>
}
