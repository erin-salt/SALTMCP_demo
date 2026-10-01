// Builds src/data/backBayMap.ts: a schematic Back Bay map in SVG coordinates.
// Input: scripts/back-bay-geocodes.json, venue street addresses -> [lat, lng],
// from the US Census geocoder (public domain), two corrected by hand. Streets
// are fitted to those points, rotated so Boylston Street runs level, as the
// grid is usually drawn. Re-run after adding geocodes:
//
//   node scripts/build-back-bay-map.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const geo = JSON.parse(readFileSync(new URL('./back-bay-geocodes.json', import.meta.url), 'utf8'))
const W = 1000, H = 600, PAD = 36
const lat0 = 42.348, lng0 = -71.08, k = Math.cos(lat0 * Math.PI / 180)
const raw = Object.fromEntries(Object.entries(geo).map(([a, [lat, lng]]) => [a, [(lng - lng0) * k * 1e4, -(lat - lat0) * 1e4]]))
const street = (a) => a.split(',')[0].replace(/^[\d-]+[A-Z]? /, '').replace('ST JAMES', 'SAINT JAMES').replace('STUART ST ST', 'STUART ST')
const on = (name, pts = raw) => Object.entries(pts).filter(([a]) => street(a) === name).map(([, p]) => p)

// Rotate so the best-fit line through Boylston's venues is level.
const fit = (pts) => { const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length; const sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0), sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0), syy = pts.reduce((s, p) => s + (p[1] - my) ** 2, 0); return { mx, my, angle: 0.5 * Math.atan2(2 * sxy, sxx - syy) } }
const angle = fit(on('BOYLSTON ST')).angle
const rot = ([x, y]) => [x * Math.cos(-angle) - y * Math.sin(-angle), x * Math.sin(-angle) + y * Math.cos(-angle)]
const turned = Object.fromEntries(Object.entries(raw).map(([a, p]) => [a, rot(p)]))
const all = Object.values(turned)
const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0])), minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]))
const scale = Math.min((W - 2 * PAD) / (maxX - minX), (H - 2 * PAD - 40) / (maxY - minY))
const ox = (W - (maxX - minX) * scale) / 2, oy = PAD + 40 + ((H - 2 * PAD - 40) - (maxY - minY) * scale) / 2
const xy = ([x, y]) => [+(ox + (x - minX) * scale).toFixed(1), +(oy + (y - minY) * scale).toFixed(1)]
const points = Object.fromEntries(Object.entries(turned).map(([a, p]) => [a, xy(p)]))

const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
const yOf = (name) => mean(on(name, points).map((p) => p[1]))
const xOf = (name) => mean(on(name, points).map((p) => p[0]))
const boylston = yOf('BOYLSTON ST'), newbury = yOf('NEWBURY ST'), block = boylston - newbury
const comm = newbury - block, marlborough = comm - block * 0.85, stJames = boylston + block * 0.95
const cross = { 'Arlington St': xOf('ARLINGTON ST'), 'Berkeley St': xOf('BERKELEY ST'), 'Clarendon St': xOf('CLARENDON ST'), 'Dartmouth St': xOf('DARTMOUTH ST'), 'Exeter St': xOf('EXETER ST'), 'Gloucester St': xOf('GLOUCESTER ST'), 'Hereford St': xOf('HEREFORD ST') }
cross['Fairfield St'] = (cross['Exeter St'] + cross['Gloucester St']) / 2
// The grid is evenly spaced; Hereford has a single venue, so space it from its neighbours.
cross['Hereford St'] = cross['Gloucester St'] - (cross['Exeter St'] - cross['Gloucester St']) / 2
const line = (pts) => { const f = fit(pts); const dx = Math.cos(f.angle), dy = Math.sin(f.angle); return (t0, t1) => [[f.mx + dx * t0, f.my + dy * t0], [f.mx + dx * t1, f.my + dy * t1]] }
// Where two fitted lines cross.
const meet = (a, b) => { const [[x1, y1], [x2, y2]] = a, [[x3, y3], [x4, y4]] = b; const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d; return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)] }
const massLine = line(on('MASSACHUSETTS AV', points))(-400, 400)
const massTop = meet(massLine, [[0, marlborough - 24], [1, marlborough - 24]])
const massAve = [massTop, meet(massLine, [[0, H - 6], [1, H - 6]])]
// Huntington starts at Copley Square and runs southwest to Mass Ave.
const copley = [cross['Dartmouth St'], stJames]
const huntingtonFar = meet(line(on('HUNTINGTON AV', points))(-400, 400), massLine)
const huntington = [copley, huntingtonFar]
const stuart = yOf('STUART ST') + 6
const columbus = line(on('COLUMBUS AV', points))(-200, 200)
const r = (n) => +n.toFixed(1)
const seg = (name, [[x1, y1], [x2, y2]], kind = 'street') => ({ name, kind, x1: r(x1), y1: r(y1), x2: r(x2), y2: r(y2) })
const west = massTop[0] - 10, east = cross['Arlington St'] + 18
const streets = [
  seg('Marlborough St', [[west, marlborough], [east, marlborough]], 'minor'),
  seg('Commonwealth Ave', [[west, comm], [east, comm]], 'avenue'),
  seg('Newbury St', [[west, newbury], [east, newbury]], 'main'),
  seg('Boylston St', [[west, boylston], [east + 40, boylston]], 'main'),
  seg('St James Ave', [[cross['Exeter St'], stJames], [east, stJames]], 'minor'),
  seg('Huntington Ave', huntington, 'avenue'),
  seg('Stuart St', [[cross['Dartmouth St'] - 20, stuart], [east + 40, stuart]], 'minor'),
  seg('Columbus Ave', columbus, 'minor'),
  seg('Massachusetts Ave', massAve, 'avenue'),
  ...Object.entries(cross).map(([name, x]) => seg(name, [[x, marlborough - 14], [x, ['Arlington St', 'Berkeley St', 'Clarendon St', 'Dartmouth St'].includes(name) ? stuart + 14 : name === 'Exeter St' ? stJames + 16 : boylston + 16]], 'cross')),
]
const parks = [
  { name: 'Public Garden', x: r(east + 6), y: r(marlborough - 30), w: r(W - east - 6 - 8), h: r(boylston - marlborough + 10) },
  { name: 'Copley Square', below: true, x: r(cross['Dartmouth St'] + 5), y: r(boylston + 6), w: r(cross['Clarendon St'] - cross['Dartmouth St'] - 10), h: r(stJames - boylston - 12) },
  { name: '', x: r(west), y: r(comm - 4), w: r(east - west), h: 8 },
]
const landmarks = [{ name: 'Prudential Center', ...Object.fromEntries(['x', 'y'].map((k2, i) => [k2, points['800 BOYLSTON ST, Boston, MA 02199'][i]])) }]

const out = `// Generated by scripts/build-back-bay-map.mjs. Do not edit by hand.
// A schematic Back Bay map in a ${W}x${H} SVG: streets fitted to geocoded venue
// addresses (US Census geocoder, public domain), rotated so Boylston runs level.
// Host-side presentation of SALT's addresses, not SALT data.
export const MAP_SIZE = { width: ${W}, height: ${H} }
export const STREETS: { name: string; kind: 'main' | 'avenue' | 'minor' | 'cross' | 'street'; x1: number; y1: number; x2: number; y2: number }[] = ${JSON.stringify(streets)}
export const PARKS: { name: string; below?: boolean; x: number; y: number; w: number; h: number }[] = ${JSON.stringify(parks)}
export const LANDMARKS: { name: string; x: number; y: number }[] = ${JSON.stringify(landmarks)}
// Street address (as SALT gives it) -> map position.
export const ADDRESS_POINTS: Record<string, [number, number]> = ${JSON.stringify(points)}
`
writeFileSync(new URL('../src/data/backBayMap.ts', import.meta.url), out)
console.log('streets', streets.length, 'points', Object.keys(points).length, 'angle', (angle * 180 / Math.PI).toFixed(1))
