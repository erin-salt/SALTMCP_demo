import type { ReactNode } from 'react'

// Placeholder imagery, generated in code. These stand in for photos the
// customer product would own; they deliberately depict nothing specific.
const PALETTES = [
  ['#f6c9a8', '#e0714c', '#fff4ea'], ['#cfe3d6', '#4f8f6e', '#f3faf5'], ['#f3d9a0', '#c98b2b', '#fff8e8'],
  ['#d7d4ee', '#6a63b5', '#f6f5fd'], ['#f5c6c6', '#c4545e', '#fff3f3'], ['#c9dfee', '#3f7fae', '#f2f8fd'],
  ['#e7d2bd', '#8c5a3c', '#fbf5ef'], ['#dfe7b8', '#7d8f2e', '#f9fbeb'],
]
const hash = (text: string) => [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7)

export function PlaceholderPhoto({ seed, className }: { seed: string; className?: string }) {
  const n = hash(seed)
  const [base, accent, light] = PALETTES[n % PALETTES.length]
  const variant = (n >>> 3) % 3
  return <svg className={`photo ${className ?? ''}`} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Placeholder image">
    <rect width="100" height="100" fill={base} />
    {variant === 0 && <><circle cx="50" cy="56" r="30" fill={light} /><circle cx="50" cy="56" r="19" fill={accent} opacity=".85" /><circle cx="43" cy="50" r="5" fill={light} opacity=".7" /></>}
    {variant === 1 && <><rect x="-10" y="62" width="120" height="50" fill={accent} opacity=".8" /><circle cx="70" cy="34" r="14" fill={light} /><rect x="14" y="30" width="22" height="34" rx="11" fill={light} opacity=".9" /></>}
    {variant === 2 && <><path d="M0 70 Q30 40 60 62 T100 52 V100 H0Z" fill={accent} opacity=".85" /><circle cx="30" cy="30" r="10" fill={light} /><circle cx="64" cy="26" r="6" fill={light} opacity=".7" /></>}
  </svg>
}

// A stylised, deliberately schematic Back Bay: river to the north, the
// Commonwealth Avenue mall, the Public Garden to the east, the Fens to the
// south-west. Positions are approximate and illustrative.
export function BackBayMap({ children }: { children?: ReactNode }) {
  const streets = [30, 42, 52, 62, 74]
  const cross = [18, 28, 38, 48, 58, 68, 78]
  return <div className="map">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <rect width="100" height="100" fill="#eef1ec" />
      <path d="M0 0 H100 V16 Q80 22 60 17 T20 19 T0 17Z" fill="#cfe2ee" />
      <path d="M86 26 H100 V58 H84 Z" fill="#d6e8d0" />
      <path d="M0 78 Q10 72 18 80 T30 100 H0Z" fill="#d6e8d0" />
      <rect x="0" y="51" width="84" height="2.6" fill="#dcead5" />
      {streets.map((y) => <rect key={y} x="0" y={y} width="86" height=".7" fill="#fff" />)}
      {cross.map((x) => <rect key={x} x={x} y="20" width=".5" height="80" fill="#fff" />)}
      <path d="M0 88 L100 70" stroke="#fff" strokeWidth="1.4" />
    </svg>
    <span className="map-label" style={{ left: '8%', top: '4%' }}>Charles River</span>
    <span className="map-label" style={{ left: '87%', top: '38%' }}>Public Garden</span>
    <span className="map-label" style={{ left: '20%', top: '46%' }}>Commonwealth Ave</span>
    {children}
  </div>
}
