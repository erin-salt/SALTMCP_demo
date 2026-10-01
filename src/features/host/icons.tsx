import type { ItemKind, SaveSource } from '../../domain/types'

const paths: Record<ItemKind | SaveSource | 'meal' | 'check' | 'compass' | 'external' | 'sun' | 'cloud' | 'rain' | 'walk' | 'x' | 'arrows' | 'refresh', string> = {
  refresh: 'M13 8a5 5 0 1 1-1.6-3.7M13.2 2.6v2.6h-2.6',
  sun: 'M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1',
  cloud: 'M4.5 12.5h7a2.8 2.8 0 0 0 .3-5.6A4 4 0 0 0 4.2 7.6 2.5 2.5 0 0 0 4.5 12.5Z',
  rain: 'M4.5 10h7a2.8 2.8 0 0 0 .3-5.6A4 4 0 0 0 4.2 5.1 2.5 2.5 0 0 0 4.5 10ZM5.5 12l-.7 1.8M8.5 12l-.7 1.8M11.5 12l-.7 1.8',
  walk: 'M8.5 3.5a1.2 1.2 0 1 0 0-.01M7.5 6 6 9.5l2 1.5.5 3.5M7.5 6l2.3 1.6 1.7-.6M6.6 8 4.5 9',
  x: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
  arrows: 'M6 4.5 2.5 8 6 11.5M10 4.5 13.5 8 10 11.5',
  travel: 'M2 9.5 14 4.5l-1.2 3.3-4.2 1.4 1.6 4.3-1.5.5-2.6-3.8-2.7.9L2 12Z',
  stay: 'M2 12V5m0 4.5h12V12M5 7.5a1.3 1.3 0 1 0 0-.01M8 7h4.5A1.5 1.5 0 0 1 14 8.5v1',
  activity: 'M8 14s-4.5-4-4.5-7.5a4.5 4.5 0 0 1 9 0C12.5 10 8 14 8 14Zm0-6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  event: 'M2.5 5.5h11v1.8a1.3 1.3 0 0 0 0 2.4v1.8h-11V9.7a1.3 1.3 0 0 0 0-2.4ZM9.5 5.5v6',
  meal: 'M5 2v4.5a1.5 1.5 0 0 0 3 0V2M6.5 2v12M11 14V2c-1.5.8-2 2.7-2 5h2',
  check: 'M3.5 8.5 6.5 11.5 12.5 4.5',
  compass: 'M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8Zm2.6 3.6L9 9 5.4 10.6 7 7Z',
  external: 'M6 3.5H3.5v9h9V10M9 3h4v4M13 3 7.5 8.5',
  tiktok: 'M9.5 2v7.8a2.3 2.3 0 1 1-2.3-2.3M9.5 2c.3 1.7 1.5 2.8 3.3 3',
  you: 'M4.5 2.5h7v11L8 11l-3.5 2.5Z',
  friend: 'M6 7.5a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6ZM2 13.5c.4-2.4 2-3.7 4-3.7s3.6 1.3 4 3.7M10.5 3a2.2 2.2 0 0 1 0 4.3M12 9.9c1.1.5 1.8 1.7 2 3.6',
  'trip-chat': 'M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2Z',
  browsing: 'M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm3.6-1.4L14 14',
}

export function Icon({ name, className }: { name: keyof typeof paths; className?: string }) {
  return <svg className={`icon ${className ?? ''}`} viewBox="0 0 16 16" aria-hidden="true"><path d={paths[name]} /></svg>
}
