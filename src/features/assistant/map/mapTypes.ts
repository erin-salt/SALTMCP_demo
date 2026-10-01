import { PROJECTION } from '../../../data/backBayMap'

// What the venue map needs from whichever base map is drawn beneath it.
export interface MapApi {
  // Container pixel position of a point, or null before the map is ready.
  project: (lat: number, lng: number) => { x: number; y: number } | null
  fit: (points: [number, number][]) => void
  zoomBy: (direction: 1 | -1) => void
  home: () => void
  zoomed: boolean
}
export interface MapPlace { key: string; lat: number; lng: number; names: string[]; ids: string[]; status: 'open' | 'closed' | 'unknown' | 'saved'; flagged: boolean; saved: boolean; match: boolean; highlighted: boolean }

// Back Bay's centre and extent, for opening views.
export const BACK_BAY = { center: { lat: 42.3488, lng: -71.0805 }, south: 42.3405, west: -71.0935, north: 42.3545, east: -71.0685 }

// [lat, lng] onto the schematic drawing (see scripts/build-back-bay-map.mjs).
export function toSchematic(lat: number, lng: number): [number, number] {
  const { lat0, lng0, k, angle, minX, minY, scale, ox, oy } = PROJECTION
  const x = (lng - lng0) * k * 1e4, y = -(lat - lat0) * 1e4
  const rx = x * Math.cos(-angle) - y * Math.sin(-angle), ry = x * Math.sin(-angle) + y * Math.cos(-angle)
  return [ox + (rx - minX) * scale, oy + (ry - minY) * scale]
}

// The Maps JavaScript API, loaded once and only when the assistant's map is shown.
let loading: Promise<typeof google.maps> | undefined
export function loadGoogleMaps(key: string) {
  return loading ??= new Promise((resolve, reject) => {
    const callback = '__saltDemoMapsReady'
    ;(window as unknown as Record<string, () => void>)[callback] = () => resolve(google.maps)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${callback}`
    script.async = true
    script.onerror = () => { loading = undefined; reject(new Error('Google Maps failed to load')) }
    document.head.append(script)
  })
}

// The browser map key, served by the demo server (GOOGLE_MAPS_BROWSER_KEY). Asked once.
let config: Promise<{ googleMapsKey: string | null }> | undefined
export const fetchMapConfig = () => config ??= fetch('/api/config').then((r) => r.ok ? r.json() : { googleMapsKey: null }, () => ({ googleMapsKey: null }))

// A muted Google style, so SALT's markers lead and Google's own places stay quiet.
export const MUTED_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f3f2ee' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b8e94' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e7e6e1' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ebeae6' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#6f737a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d9e4ea' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ saturation: -100 }, { lightness: 40 }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#a5a8ad' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e2e9d9' }] },
  { featureType: 'transit', stylers: [{ saturation: -100 }, { lightness: 25 }] },
]
