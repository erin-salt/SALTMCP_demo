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
- **Rows keep a transparent host order:** every save, in the order it was saved (first
  five visible, "See all" for the rest). No ranking. Both sides of the compare split
  show the same restaurant in the same row.
- **The compare view always shows the canonical story** (Saturday dinner, 2 people,
  around 7:30), whatever the viewer has done in the app.
- **SALT descriptor in the SALT bar:** "Status and availability for the places
  your users already chose" — anchors the one-sentence test without adding copy
  inside the host.
- **Venue facts persist across checks:** once SALT reports a closure, the host keeps
  showing it while later checks are in flight.
- **A new party size or time clears an earlier choice**, since it was made against
  different availability.
- Secondary SALT states are quiet row notes ("No tables offered around then",
  "Couldn't check just now") and live in each saved place's detail sheet.
- Contrast raised to WCAG AA for all small text; coral is a fill colour, a darker
  coral is used for text.

## Realism pass (2026-09-30, against SALT's MCP contract on GitHub `main`)
- **The demo uses SALT's real public MCP contract** (`search_venues`, `get_venue`,
  `check_availability` and their field names) with simulated responses. The SALT panel shows
  only what any key-holding customer sees in the published schema — never sources, methods,
  cache behaviour, rate limits or coverage statistics (SALT decision D37).
- **Availability is a request, not a given.** The host links saves to SALT venues once, at
  save time (`search_venues`), then calls `check_availability` at moments of intent: the
  opening view (the hero sweep is that first call), opening a day, changing party or time,
  or "Check again". Every answer shows when it was checked and visibly ages; after two
  minutes the card offers "Check again". No re-check at Reserve (owner decision).
- **Realistic coverage:** 4 of 9 operating saves can be checked live (~44%; Back Bay's real
  rate among operating, reservable venues is ~30%, and saved dinner spots skew reservable).
  Venue facts are real SALT records; availability answers are representative samples.
- **Host language for contract states:** AVAILABLE / ALTERNATIVE_TIMES → time chips;
  NONE_REPORTED → "No tables offered around then"; UNKNOWN → "Couldn't check just now";
  not live-checkable → the host's own "Check availability ↗" fallback; CLOSED_PERMANENTLY
  (venue record) → "Closed permanently".
- The tagline is unchanged pending a decision.

## Switch and highlight replace the slider (2026-09-30, owner feedback)
- **The split slider is gone.** It blocked interaction until fully dragged and could not be
  brought back easily. It is replaced by a **Without SALT / With SALT switch** in the SALT
  bar, usable at any moment while using the app; app state is kept across switches.
- **Opening:** Trip Planner shows without SALT for ~1.6s, then SALT is switched on and the
  first `check_availability` request is the reveal. One gentle prompt ("Switch to compare")
  points at the switch until it is used.
- **"Highlight what SALT does"** (on by default) dims everything the host already had and
  outlines every SALT-sourced element in mint, with small tags: "Times from SALT", "Status
  from SALT", "Pins from SALT". Switch it off to see the app as a user would.
- **Without SALT, the rail reads "Not connected"**, so the boundary is visible from both sides.
- **Freshness is a pill:** "● Checked just now", becoming "↻ Checked 3 min ago | Refresh".
- **Coverage (owner decision):** every operating save is a venue SALT can check live today
  (all from SALT's 25 live Back Bay venues); Lucca Back Bay remains the closed save. Honest
  non-answers (one "No tables offered around then") remain.

## Copy trims (2026-09-30, owner decision)
- **No itinerary timing note.** The "8:45 PM is 30 min before Jazz set" note (host-derived) is
  removed everywhere.
- **NONE_REPORTED reads "No tables found".**
- **No tagline in the SALT bar.** The bar shows SALT, the use case and "Real contract ·
  simulated responses".

## Saved intent, customer value and the assistant use case (2026-09-30)
Grounded in `SALT_market_and_beachhead_report_2026-09-29`: beachhead = saved-intent
activation products (Reely first), then small AI itinerary planners; the recommended
workflow is a read-only pre-flight scan of a user's saved Boston restaurants.

- **Saved intent (anti-discovery):** the planner's right column is "Your saved places",
  led by where each place came from ("Saved from TikTok", "Recommended by Alex"), with a
  separate status chip (planned / closed). The dinner card says "From your N saved places".
  In highlight mode the column is labelled "The user's saves · not from SALT".
- **Customer value:** a data-derived line in the SALT bar ("10 saved places to check by
  hand" → "1 request · 8 with tables · 1 closed caught") and a "For product teams" panel:
  where SALT fits, what you could build, what a pilot looks like. Claims limited to what
  SALT supports today.
- **AI assistant use case (02):** same trip and saves in a fictional chat assistant, using the
  same switch, highlight and rail. Without SALT the assistant says it can't check; with SALT
  it answers from `check_availability`. Prompts are scripted for determinism. This is the
  natural base for "Try SALT live".
- **SALT panel collapsed by default** (value first, contract one click away).
- **Proxy review** (no live participants): all three test questions pass on a first-viewer
  walkthrough. Real-prospect testing is still to do.

## Live SALT (2026-10-01, branch `live/salt-mcp`)
- The deterministic demo is preserved as tag `demo-v1-simulated`.
- **Simulated stays the default; Live is opt-in** via a Simulated/Live switch in the SALT bar.
  Live shows "Live from SALT's MCP server · salt-mcp.fly.dev" and the rail marks calls LIVE.
- **The key never reaches the browser.** The demo's own endpoint (`server/live.ts`) holds it and
  only answers about the demo's ten saves (dates within 60 days, sensible times and party sizes).
  It reuses identical answers for 90 seconds and limits each visitor to 20 requests a minute.
- **No silent fallback:** if SALT can't be reached or limits the demo, the card says so with a
  retry; sample data is never substituted in live mode.
- **Many live times per venue:** cards show the three closest to the requested time, plus "+N".
- **Trip dates** stay as designed while ahead; live mode moves the trip to an upcoming weekend
  once they pass, so live answers are always about real future dates.
- Shareable hosting: one Fly.io app (`fly.toml`, `Dockerfile`, `DEPLOY.md`), key as a Fly secret.

## Live by default, and booking direct (2026-10-01, owner decision)
- **Live is now the default** data source; Simulated remains one click away in the SALT bar.
- **Reserve hands off to the restaurant's own site.** Each operating save carries a host-owned
  `bookingUrl` (the restaurant's own reservations page or homepage booking widget, checked
  2026-10-01). SALT still supplies no booking links.
- **Handoff copy:** "Book direct with the restaurant for the best experience. Your booking goes
  straight to their team, and it's the best way to support the local places you love." The
  "nothing is booked" and "demo ends at the handoff" lines are removed; the planned card still
  shows "Not booked".

## The live AI assistant (2026-10-01, owner decisions)
Purpose: let viewers explore SALT without the planner's UI, while making its capabilities and
boundaries obvious as they test it.
- **Scope (owner chose "b"):** any Back Bay venue the user names, plus the saves. No browsing or
  discovery: the model can only look venues up by name (`find_venue`) and check tables for venues
  it was given or looked up (`check_availability`). It never sees the coverage list.
- **Words vs facts:** Claude (Opus 5.5, via an Anthropic key held server-side) writes 1–3 sentences;
  every fact is a card built from SALT's tool results, with a "Checked with SALT" receipt that
  expands to the exact calls. Highlight tags the two: "Words: Trip Planner's AI" / "Facts: SALT".
- **Boundaries up front:** the opening card lists what SALT can tell you (open, takes reservations,
  tables for a date, time and party), what the assistant can't do (recommend, rank, menus, reviews,
  hours, book) and where SALT works. Suggestions are grouped "Try it", "Check a place" and "Test the
  limits", so viewers are invited to probe the edges, not just the happy path.
- **Back Bay coverage for people who don't know Boston:** a "Coverage · Back Bay, Boston" chip in the
  SALT bar; the opening card places Back Bay (Newbury Street, Boylston Street, Copley Square) and
  states live coverage from SALT's own counts ("Live tables for 25 of its 194 open venues"). "New to
  Back Bay? See where SALT can check tables" lists the live venues alphabetically — coverage, not a
  recommendation — and tapping one drafts a question about it.
- **Without SALT:** the assistant answers from the saves alone and never calls Claude. Answers given
  with SALT are hidden ("This answer came from SALT. Switch SALT on to see it."), because no SALT
  data, including the AI's words about it, appears without SALT.
- **Budget (owner: $10/month):** each reply is priced from usage and recorded; the assistant stops at
  $10/month or $2/day and says so. Also set an Anthropic workspace spend limit. Per visitor: 12
  messages per 5 minutes. Highlight keeps the boundaries and composer readable; only the AI's
  words dim.

## The live assistant, iteration 2: a Back Bay explorer (2026-10-01, owner feedback)
Owner feedback on iteration 1: "restrictive rather than free and intuitive… a lot of instructions";
give the user free roaming of the dataset, show full Back Bay coverage including closed places,
keep the conversation; leave out the live-venue count (it will grow).
- **Map + chat, side by side.** The left half is a schematic map of Back Bay with every venue SALT
  serves (231, open, closed and unknown), filters (All / Open / Closed, with SALT's counts), search,
  and zoom. Clicking a marker shows SALT's facts for it, with "Ask about a table". Venues at one
  address (the Prudential Center, Copley Place) share a numbered marker. Your saves carry a blue ring.
- **Instructions out, exploration in.** The chat opens with one line and three ideas. The boundary
  details sit behind "What can SALT tell me?"; the boundaries otherwise show themselves when asked.
- **Map and chat are linked.** Whatever an answer is about lights up on the map; tapping a name in
  the chat flies the map there.
- **Scope widened (supersedes "b"):** the assistant can search SALT's whole Back Bay directory by
  name, street, status, reservations or live support, and check tables at any venue in it. It still
  never ranks or recommends: lists are in name order, by SALT's facts only.
- **Without SALT** the map shows only the user's 10 saves (placed from the host's own saved
  addresses) and says so; with SALT it fills with the whole neighbourhood.
- **The map** is drawn by the host: streets fitted to the venues' geocoded addresses (US Census
  geocoder, public domain; two corrected by hand), rotated so Boylston runs level, labelled
  "Schematic map · positions approximate". No tile service or map licence involved. Rebuild with
  `node scripts/build-back-bay-map.mjs`; a venue whose address isn't in the geocode file appears in
  search and lists but not on the map until it is added.
- **No live-venue count** anywhere; "Live tables" appears per venue only.

## The live assistant, iteration 3 brief (2026-10-01, owner interview)
Why: iteration 2's map "looks wrong/cheap" and the screen "doesn't feel like a real app".
Audience: a prospective customer (product/eng lead at a travel or AI company) who should leave
believing SALT's data is broad, real and trustworthy. Framing stays inside Trip Planner.

- **Layout:** split, but polished. Real map left, assistant right. Feel: Airbnb / Booking.com.
- **Map:** Google Maps (Maps JavaScript API) with a muted, desaturated custom style. Google's own
  restaurant icons stay visible but quiet; SALT's venues sit on top as clean SALT markers.
- **Coverage:** everything, always. All of SALT's Back Bay venues are on the map from the start,
  closed ones included.
- **Closures Google still shows:** for venues SALT knows are closed, check whether Google's place
  data still lists them as operating. Those get a distinct marker (coral ring) and a callout on
  tap ("Closed permanently, per SALT", plus a quiet line that maps may still list it). The match
  must be verified on a sample and shown to the owner before it ships; no claim about Google is made
  from unverified matches. Places lookups run server-side, cached, with a separate key.
- **Venue card:** an Airbnb-style popover on the map. Photo, description, cuisine/price and
  ratings are placeholder (skeleton/lorem styling, never real-looking numbers): self-evidently host
  content. SALT facts (status, reservations, live tables) are real and carry the SALT mark in
  Highlight. "Check tables" works in the card (a default check for Saturday 7:30 with the trip's
  party, with time slots shown inline) plus "Ask the assistant" for anything else.
- **No standing venue list.** Cards appear only inside chat answers.
- **Chat → map:** venues in an answer are emphasised and the map pans/zooms to fit them; the rest
  dim slightly.
- **Chat start:** one greeting line and three tappable ideas.
- **Without SALT:** Google's map and icons plus the user's 10 saves only; no statuses or closure
  flags. Switching SALT on reveals the full directory and the closures.
- **Mobile:** the map fills the screen; the chat is a draggable bottom sheet (Google Maps style).
- **Kept:** the MCP rail beside the assistant, and Highlight mode. "Checked with SALT" receipts
  under answers were not kept (the rail already shows the calls).
- **Keys:** a browser Maps key restricted to the demo's domains, plus a Map ID for the custom
  style; a separate server-side key for Places, never sent to the browser.

## Closure flag dropped (2026-10-01, owner decision)
A one-off check of SALT's 37 closed Back Bay venues against Google's place data (37 Places calls)
found no verified case of Google listing as open a place SALT knows is closed: 29 matched as
permanently closed, 5 were temporarily closed on Google, and the 3 "operational" results were other
branches of chains. The "closed, still on maps" marker, callout and check script were removed;
Google stays a plain backdrop and the demo makes no claims about Google. The check's results were
not kept.

## Reservations-led map and a demo-only closure layer (2026-10-01, owner decisions)
- The map leads with SALT's `reservable` field: places that take reservations are dark markers;
  everything else is a small grey dot. Filters: All · Takes reservations. Markers were redesigned
  flatter and smaller (owner: the previous ones looked "playdough").
- Closed venues are hidden by default and shown only through a "Demo · Closed venues" chip, with a
  short message: SALT keeps a record of every permanently closed venue, so your app never sends a
  traveller somewhere that's shut.
- From there the viewer picks one of four fixed scenarios (a stable rotation, verified against
  SALT's data): Trip Planner's own AI suggests three real places (scripted, labelled "Demo ·
  scripted"); SALT's real record shows one is permanently closed, struck out in coral and on the
  map. No model call. "Try another" cycles the rotation. Scenarios whose venues SALT no longer has
  (or no longer lists as closed) are skipped.
- When the chat or a scenario highlights places, a "N places from the chat · Show all" pill returns
  the whole map (fixes being stuck in the highlighted view).

## Explorer, decluttered (2026-10-01, second owner interview)
Story: "SALT covers everything." Pain: cluttered, faded, hard to click; closed-venue demo badly placed.
- **Map:** open places only; controls are search ("Search 194 places in Back Bay") and zoom. Filters,
  legend, demo chip, highlight tag and "Show all" removed.
- **Markers (Airbnb-style):** white pills, never faded. A place alone shows its name; places that would
  overlap on screen merge into a count pill at their centre, and tapping it zooms in two levels there.
  A shared address shows "N places". The latest answer's places and the selected place always get their
  own dark pill.
- **Map ↔ chat, gently:** no dimming; the map only moves if none of an answer's places are on screen;
  tapping a name in the chat opens its card.
- **Chat:** greeting, conversation, input. Starter ideas, "Try" chips, "What can SALT tell me" and the
  Words/Facts tags removed.
- **Card:** photo-led and minimal: photo, name, street, one line of SALT facts, Check tables.
- **Closed venues demo lives in the SALT panel:** "Run the demo" shows the planner proposing three real
  places and SALT's record filtering the permanently closed one out ("2 of 3 suggestions" reach the
  traveller). The chat shows only the two that passed, with a one-line pointer to the panel.

## Developer panel: one entry per real call (2026-10-01, owner decisions)
Prompted by a developer's-eye review: the panel had summarised and filtered what crossed the boundary.
- **Rule:** the SALT panel shows one entry per real call to SALT, with the exact arguments and result.
  Trip Planner's own tools (`find_venues`, `more_tables`) are labelled "Trip Planner tool", with the
  SALT calls they made nested underneath, and a note on what the app did with the answers (e.g. "Checked
  4 places nearest the hotel; kept the 3 with tables"). The demo server records the calls as it makes them
  (`server/live.ts`, `trace` on every response), so the panel can't drift from reality.
- Every source of SALT calls reports to the panel: meal checks, place-card checks, the assistant, and
  linking the saves (`search_venues` × 10). An assistant answer with no SALT calls says so; an error that
  never reached SALT reads "Not sent to SALT".
- Each call shows latency (or "demo cache" / "simulated"), `time_zone`, `checked_at` as returned plus its
  age, and Request / Response JSON with Copy. Times are ISO 8601 with offset, as SALT returns them;
  simulated responses now use SALT's full venue records and the same ISO shape.
- The latest entry is open; earlier ones are one line each behind "Show earlier calls".
- Header says "Live responses" or "Simulated responses" once; the duplicate footer is gone.
- A **Contract** section reads SALT's tool schemas live from its MCP server (`tools/list`).
- **Coverage numbers are shown** (owner decision): the SALT bar reads "Coverage · Back Bay, Boston ·
  N venues · N checkable live", from SALT's own directory. Supersedes the realism-pass rule against
  coverage statistics.
- **Directory build calls are not shown** (owner decision, for now): the `search_venues` sweep that
  gathers the Back Bay directory stays out of the panel. `find_venues` notes that it searched Trip
  Planner's stored copy of the directory with no call to SALT.
- **Demo cache reuse is shown** (owner decision): it is the demo server's own 90-second reuse, not SALT's
  internals. Rate limits and pricing are not shown anywhere; they don't exist yet.
- The closed-venues demo stays in the panel but apart from the log, labelled "Scripted demo · no model
  call", with the source of each status (`search_venues`, and when it was fetched).
