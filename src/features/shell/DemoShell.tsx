import type { ReactNode } from 'react'
import { SaltRail, type Exchange } from './SaltRail'

interface Props { exchanges: Exchange[]; onReset: () => void; children: ReactNode }

export function DemoShell({ exchanges, onReset, children }: Props) {
  return <div className="shell">
    <header className="shell-bar">
      <div className="shell-id">
        <SaltMark />
        <span className="shell-usecase"><span>Use case 01</span><span aria-hidden="true">/</span>Travel planning</span>
      </div>
      <div className="shell-tools">
        <span className="shell-sample" title="SALT responses come from a fixed sample fixture. No live requests are made.">Simulated<span className="wide-only"> responses</span></span>
        <button className="shell-reset" onClick={onReset}>Reset</button>
      </div>
    </header>
    <div className="shell-stage">
      <div className="host-window" aria-label="Wayfarer, a travel planning product">{children}</div>
      <SaltRail exchanges={exchanges} />
    </div>
  </div>
}

export function SaltMark({ small = false }: { small?: boolean }) {
  return <span className={`salt-mark${small ? ' small' : ''}`}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" /></svg>SALT</span>
}
