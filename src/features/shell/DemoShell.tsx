import type { ReactNode } from 'react'
import type { SaltVenue } from '../../domain/types'
import type { SaltMode } from '../host/TripPlannerApp'
import { SaltRail, type CheckExchange } from './SaltRail'

interface Props {
  mode: SaltMode
  highlight: boolean
  prompt: boolean
  saved: number
  venues: (SaltVenue | undefined)[]
  exchanges: CheckExchange[]
  onMode: (mode: SaltMode) => void
  onHighlight: () => void
  onReset: () => void
  children: ReactNode
}

export function DemoShell({ mode, highlight, prompt, saved, venues, exchanges, onMode, onHighlight, onReset, children }: Props) {
  return <div className="shell">
    <header className="shell-bar">
      <div className="shell-id">
        <SaltMark />
        <span className="shell-tagline">Status and availability for the places your users already chose</span>
        <span className="shell-usecase"><span>Use case 01</span><span aria-hidden="true">/</span>Travel planning</span>
      </div>
      <div className="shell-tools">
        <span className="shell-sample" title="SALT's real MCP tools and fields, with responses from a fixed sample. No live requests are made.">Real contract<span className="wide-only"> · simulated responses</span></span>
        <button className="shell-reset" onClick={onReset}>Reset</button>
      </div>
    </header>
    <div className="shell-controls">
      <div className="mode-switch" role="group" aria-label="Trip Planner">
        <button aria-pressed={mode === 'without'} onClick={() => onMode('without')}>Without SALT</button>
        <button aria-pressed={mode === 'with'} onClick={() => onMode('with')}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" /></svg>With SALT</button>
      </div>
      {prompt && <span className="shell-prompt" aria-hidden="true">Switch to compare</span>}
      <button className="highlight-switch" role="switch" aria-checked={highlight && mode === 'with'} disabled={mode !== 'with'} onClick={onHighlight}>
        <span className="switch-track" aria-hidden="true"><span /></span>Highlight what SALT does
      </button>
    </div>
    <div className="shell-stage">
      <div className="host-window">{children}</div>
      <SaltRail connected={mode === 'with'} saved={saved} venues={venues} exchanges={exchanges} />
    </div>
  </div>
}

export function SaltMark({ small = false }: { small?: boolean }) {
  return <span className={`salt-mark${small ? ' small' : ''}`}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" /></svg>SALT</span>
}
