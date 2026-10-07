# SALT customer demo

A customer-facing prototype showing how SALT adds restaurant feasibility (is each place still open, is there a table around the time you want) to a travel product's existing trip and saved-place data. The host product is a fictional **Trip Planner**; SALT's coverage today is Boston's Back Bay.

Live at **https://salt-demo.fly.dev**.

## What's in the demo

- **01 · Trip planner app**: ten saved Back Bay places on a weekend trip. Switch **Without SALT / With SALT** to compare; **Highlight what SALT does** marks SALT's contribution. Booking hands off to the restaurant's own page (SALT books nothing).
- **02 · AI assistant**: with live SALT and an Anthropic key, a free-form Back Bay explorer: a map of every venue SALT has (closed ones included) beside a chat where Claude answers from SALT alone. Otherwise a scripted assistant. A scripted "closure" demo in the SALT panel shows SALT catching a closed place among an AI's suggestions.
- **SALT panel** (rail): a developer's view with one entry per question the app asked, holding every real call to SALT's public MCP tools with the exact arguments and results.
- **For product teams**: SALT's pitch to the customer, kept to what SALT supports today.
- **Simulated / Live** (top bar): live calls SALT's real MCP server; simulated uses a fixed sample with SALT's real tools and fields. **Reset** restores the opening.

## Run locally

Needs Node 24 (the server runs TypeScript directly).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run lint
npm run build      # type-check and build to dist/
```

Keys go in `.env.local` (git-ignored). The dev server reads them; they never reach the browser bundle.

| Variable | What it enables |
| --- | --- |
| `SALT_MCP_KEY` | Live mode: calls SALT's MCP server through the demo's own endpoint (`server/live.ts`) |
| `ANTHROPIC_API_KEY` | The live AI assistant (`server/assistant.ts`, Claude Opus 5.5). Without it the tab shows the scripted assistant |
| `ANTHROPIC_WORKSPACE_ID` | Only needed if the Anthropic key isn't scoped to a workspace |
| `GOOGLE_MAPS_BROWSER_KEY` | Google map under the assistant's venues. Without it a schematic Back Bay map is drawn instead |
| `SALT_MCP_URL`, `ASSISTANT_MONTHLY_USD`, `ASSISTANT_DAILY_USD`, `ASSISTANT_DATA_DIR` | Optional overrides (defaults: $10 a month, $2 a day, spend file in `.data/`) |

To publish or update the shareable link, see [DEPLOY.md](./DEPLOY.md).

## Where things live in code

- `src/data/hostProductFixture.ts`: Trip Planner (fictional host) data: trip, itinerary, saves and their provenance.
- `src/domain/`: host logic. `planMeal.ts` combines SALT's response with host context (saved order, itinerary timing); `tripDates.ts` moves the trip to real upcoming dates for live answers.
- `src/salt/`: talking to SALT. `simulatedSalt.ts` is the deterministic stand-in; `liveSalt.ts` and `assistantClient.ts` call the demo's server; `callLog.ts` and `trace.ts` feed the SALT panel.
- `src/features/host/`: the trip planner (use case 01). `src/features/assistant/`: the AI assistant (use case 02), including the venue map in `map/`. `src/features/shell/`: the SALT shell, the SALT panel (`SaltRail.tsx`) and the product-teams sheet.
- `server/`: the demo's own server, used by both the Vite dev server and the hosted app. `live.ts` is the only connection to SALT (holds the key, answers only the demo's own questions); `assistant.ts` runs Claude; `budget.ts` caps spend; `index.ts` serves the built app on Fly.
- `scripts/build-back-bay-map.mjs`: regenerates the schematic map (`src/data/backBayMap.ts`) from `scripts/back-bay-geocodes.json`.

## Design

- [DESIGN_DIRECTION.md](./DESIGN_DIRECTION.md): design decisions.
- [SALT_DEMO_DESIGN_CONTEXT.md](./SALT_DEMO_DESIGN_CONTEXT.md): the research, product boundaries and open design questions behind the demo. Context for iteration, not a fixed UI specification.
