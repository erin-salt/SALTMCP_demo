import { useEffect, useRef } from 'react'
import { ADDRESS_LATLNG } from '../../../data/backBayMap'
import { BACK_BAY, MUTED_STYLE, loadGoogleMaps, type MapApi } from './mapTypes'

// Google's map under SALT's markers. One map per visit: switching SALT on or
// off, highlighting, panning and zooming reuse it. Google's own place icons
// stay visible but can't be clicked, so nothing beyond the map itself is loaded.
export function GoogleBackdrop({ apiKey, onApi, onError }: { apiKey: string; onApi: (api: MapApi) => void; onError: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const publish = useRef(onApi)
  const failed = useRef(onError)
  useEffect(() => { publish.current = onApi; failed.current = onError })

  useEffect(() => {
    let cancelled = false
    let frame = 0
    let listener: google.maps.MapsEventListener | undefined
    loadGoogleMaps(apiKey).then((maps) => {
      if (cancelled || !ref.current) return
      // Open framed on SALT's venues, clear of the search bar and Google's logo.
      const bounds = new maps.LatLngBounds()
      Object.values(ADDRESS_LATLNG).forEach(([lat, lng]) => bounds.extend({ lat, lng }))
      const homePadding = { top: 64, bottom: 36, left: 24, right: 24 }
      const map = new maps.Map(ref.current, {
        center: BACK_BAY.center, zoom: 15, styles: MUTED_STYLE, disableDefaultUI: true, clickableIcons: false,
        gestureHandling: 'greedy', keyboardShortcuts: false, minZoom: 13, maxZoom: 19,
      })
      map.fitBounds(bounds, homePadding)
      let homeZoom = 15
      maps.event.addListenerOnce(map, 'idle', () => { homeZoom = map.getZoom() ?? 15 })
      const overlay = new maps.OverlayView()
      overlay.onAdd = () => {}
      overlay.onRemove = () => {}
      const send = () => publish.current({
        project: (lat, lng) => {
          const point = overlay.getProjection()?.fromLatLngToContainerPixel(new maps.LatLng(lat, lng))
          return point ? { x: point.x, y: point.y } : null
        },
        fit: (points) => {
          if (!points.length) return
          if (points.length === 1) { map.panTo({ lat: points[0][0], lng: points[0][1] }); map.setZoom(Math.max(map.getZoom() ?? 15, 17)); return }
          const b = new maps.LatLngBounds()
          points.forEach(([lat, lng]) => b.extend({ lat, lng }))
          // On a phone the chat sheet covers the lower part of the map.
          const div = map.getDiv(), tall = div.clientHeight > div.clientWidth
          map.fitBounds(b, { top: 90, bottom: tall ? Math.round(div.clientHeight * 0.5) : 70, left: 50, right: 50 })
        },
        zoomBy: (direction) => map.setZoom((map.getZoom() ?? 15) + direction),
        home: () => map.fitBounds(bounds, homePadding),
        zoomed: (map.getZoom() ?? 15) > homeZoom,
      })
      overlay.draw = send
      overlay.setMap(map)
      listener = map.addListener('bounds_changed', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(send) })
    }, () => { if (!cancelled) failed.current() })
    return () => { cancelled = true; cancelAnimationFrame(frame); listener?.remove() }
  }, [apiKey])

  return <div ref={ref} className="vm-google" />
}
