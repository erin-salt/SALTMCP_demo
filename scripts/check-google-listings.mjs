// One-off, owner-approved check: for each venue SALT knows is closed, does
// Google's place data still list it as operating? Writes a review file for a
// person to check by hand; nothing ships from it until then (see
// src/data/mapListings.ts).
//
// Spends Google Places calls, so it is deliberately hard to run by accident:
//   - only SALT's closed Back Bay venues (about 37), one Text Search each;
//   - a hard cap of MAX_CALLS, checked before anything is sent;
//   - only four fields requested (id, name, address, business status);
//   - without --confirm it only prints what it would do.
//
//   node --env-file=.env.local scripts/check-google-listings.mjs            # dry run
//   node --env-file=.env.local scripts/check-google-listings.mjs --confirm  # spends calls
//
// Needs the demo server running locally for SALT's directory
// (DEMO_URL, default http://localhost:5173), and GOOGLE_PLACES_KEY.
import { mkdirSync, writeFileSync } from 'node:fs'

const MAX_CALLS = 45
const FIELDS = 'places.id,places.displayName,places.formattedAddress,places.businessStatus'
const demo = process.env.DEMO_URL ?? 'http://localhost:5173'
const confirm = process.argv.includes('--confirm')

const directory = await fetch(`${demo}/api/live/directory`).then((r) => r.json())
const closed = directory.venues.filter((v) => v.status.startsWith('CLOSED'))
console.log(`SALT's Back Bay directory: ${directory.venues.length} venues, ${closed.length} closed.`)
if (closed.length > MAX_CALLS) { console.error(`Refusing: ${closed.length} calls is over the cap of ${MAX_CALLS}.`); process.exit(1) }
if (!confirm) {
  console.log(`Dry run. With --confirm this sends ${closed.length} Places Text Search requests (fields: ${FIELDS}).`)
  closed.forEach((v) => console.log(`  ${v.name} · ${v.address}`))
  process.exit(0)
}
const key = process.env.GOOGLE_PLACES_KEY
if (!key) { console.error('GOOGLE_PLACES_KEY is not set.'); process.exit(1) }

const rows = []
let calls = 0
for (const venue of closed) {
  if (++calls > MAX_CALLS) break
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
    body: JSON.stringify({ textQuery: `${venue.name}, ${venue.address}`, pageSize: 1 }),
  })
  const body = await response.json()
  if (!response.ok) { console.error(`Stopped after ${calls} calls: ${body.error?.message ?? response.status}`); break }
  const place = body.places?.[0]
  rows.push({
    venue_id: venue.venue_id, salt_name: venue.name, salt_address: venue.address, salt_status: venue.status,
    google_place_id: place?.id ?? null, google_name: place?.displayName?.text ?? null, google_address: place?.formattedAddress ?? null, google_status: place?.businessStatus ?? null,
    // To be filled by the reviewer: is this Google place the same venue?
    same_venue: null,
  })
  console.log(`${calls}. ${venue.name} → ${place ? `${place.displayName?.text} · ${place.businessStatus}` : 'no match'}`)
}
mkdirSync('.data', { recursive: true })
writeFileSync('.data/google-listings-review.json', JSON.stringify({ checked: new Date().toISOString().slice(0, 10), calls, rows }, null, 2))
console.log(`\n${calls} Places calls made. Review .data/google-listings-review.json (git-ignored) before anything ships.`)
