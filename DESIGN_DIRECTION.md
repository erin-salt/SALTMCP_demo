# SALT Demo — Design Direction

Decisions from the design-direction interview (2026-09-30). These sit on top of
`SALT_DEMO_DESIGN_CONTEXT.md` (durable principles) and override the previous
redesign (`redesign/salt-rail-v1` branch) wherever they conflict.

## Problems with the previous version
- The story didn't land fast enough.
- The host app wasn't convincing as a real product.
- Too busy: too many elements and too much text.
- (Not a problem: the dark SALT shell / technical feel.)

## Audience and setting
- **Sent as a link.** Prospects open it alone; it must explain itself.
- **Desktop and mobile equally** — must feel designed for both.

## The core idea
- **First 5 seconds: the before → after.** A viewer should immediately see what
  changes when SALT is added.
- **Mechanism: split slider, "reveal then explore".** The page opens on a split
  view of the same trip — without SALT on one side, with SALT on the other —
  as the hero moment. Dragging fully to "With SALT" (or a button) drops the viewer
  into the full interactive app. The comparison can be reopened at any time.
- **SALT is subtle but always present** as a layer, not a widget in the host.
- **Guidance: one gentle prompt** pointing at the single next action. No tours.

## Exploration (after the reveal)
- Plan **both meal gaps** (Saturday dinner, Sunday lunch).
- **Tap any saved place** to see its detail and what SALT knows about it.
- **Change party size / time** and see SALT's answers change (proves SALT
  responds to host context). Sample data must cover these variants honestly.
- Booking stays a lightweight external handoff; nothing is booked.

## Host product
- **Rename WAYFARER.** Use a plausible name **plus a small persistent
  "Fictional app" badge** so it is never mistaken for a real company.
- **Mood: bright consumer** — clean, white, photo-led, friendly (Airbnb /
  Google Travel territory).
- **Realism:** photos and imagery, an **ambient map** of Back Bay (hotel,
  itinerary stops, saves; not interactive beyond basics), and richer believable
  content (bookings, weather, walking distances, notes, trip collaborators).
- **Images are supplied by the user.** Until then use clearly marked
  placeholders; never scrape or imply photos of the real restaurants.

## SALT layer
- **Keep the dark SALT shell** around the light host app.
- **Keep the SALT side panel, but lighter:** one short line per event instead of
  structured request/response detail.
- Honest states (unknown, not covered, not matched, provider negatives) stay
  truthful but visually secondary.

## Done when
- **One-sentence test:** someone unfamiliar with SALT, alone with the link, can
  explain what SALT does in one sentence after 60 seconds.
- **Looks like a real, shipped consumer app** at a glance (apart from the badge).
- **Investor-ready** today.
- **Works as a single hero screenshot** for a website or deck.

## References
None supplied — designer's judgement within the above.

## Decisions made during the build (2026-09-30)
- Host name: **Trip Planner**, with a dashed "Fictional app" badge. Imagery is
  generated placeholder art; the map is a stylised Back Bay illustration.
- **Rows keep a transparent host order:** saves with observed times in the order
  they were saved, then saves known to be closed. No ranking. This also keeps the
  compare split honest: both sides show the same restaurant in the same row.
- **The compare view always shows the canonical story** (Saturday dinner, 2 people,
  around 7:30), whatever the viewer has done in the app.
- **SALT descriptor in the SALT bar:** "Status and availability for the places
  your users already chose" — anchors the one-sentence test without adding copy
  inside the host.
- **Venue facts persist across checks:** once SALT reports a closure, the host keeps
  showing it while later checks are in flight.
- **A new party size or time clears an earlier choice**, since it was made against
  different availability.
- Secondary SALT states live in a folded "N more saves · no times observed" line
  and in each saved place's detail sheet.
- Contrast raised to WCAG AA for all small text; coral is a fill colour, a darker
  coral is used for text.
