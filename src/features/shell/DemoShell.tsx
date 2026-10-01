import type { ReactNode } from 'react'
import type { SaltVenue } from '../../domain/types'
import { SaltRail, type CheckExchange } from './SaltRail'

interface Props { phase: 'compare' | 'explore'; saved: number; venues: (SaltVenue | undefined)[]; exchanges: CheckExchange[]; onExplore: () => void; onCompare: () => void; onReset: () => void; children: ReactNode }

export function DemoShell({ phase, saved, venues, exchanges, onExplore, onCompare, onReset, children }: Props) {
  return <div className="shell">
    <header className="shell-bar">
      <div className="shell-id">
        <SaltMark />
        <span className="shell-tagline">Status and availability for the places your users already chose</span>
        <span className="shell-usecase"><span>Use case 01</span><span aria-hidden="true">/</span>Travel planning</span>
      </div>
      <div className="shell-tools">
        <span className="shell-sample" title="SALT's real MCP tools and fields, with responses from a fixed sample. No live requests are made.">Real contract<span className="wide-only"> · simulated responses</span></span>
        {phase === 'compare'
          ? <button className="shell-cta" onClick={onExplore}>Try it <span aria-hidden="true">→</span></button>
          : <button className="shell-reset" onClick={onCompare}>Compare</button>}
        <button className="shell-reset" onClick={onReset}>Reset</button>
      </div>
    </header>
    <div className="shell-stage">
      <div className="host-window">{children}</div>
      <SaltRail saved={saved} venues={venues} exchanges={exchanges} />
    </div>
  </div>
}

export function SaltMark({ small = false }: { small?: boolean }) {
  return <span className={`salt-mark${small ? ' small' : ''}`}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" /></svg>SALT</span>
}
