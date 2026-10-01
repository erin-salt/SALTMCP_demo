# SALT customer demo — Phase 1

A deterministic, customer-facing prototype showing how SALT can add restaurant feasibility to a travel product's existing trip and saved-place data.

## Run locally

```bash
npm install
npm run dev
```

By default the demo is **live**: it calls SALT's real MCP server through the demo's own endpoint (`server/live.ts`), which keeps the access key server-side. **Simulated** (switch in the SALT bar) uses a fixed sample instead. Put the key in `.env.local` as `SALT_MCP_KEY=...` for local live mode; see [DEPLOY.md](./DEPLOY.md) to publish a shareable link. **Reset** in the SALT bar restores the opening.

## Where ownership lives in code

- `src/data/hostProductFixture.ts` — Trip Planner (fictional host) data: trip, itinerary, saves and their provenance.
- `src/salt/simulatedSalt.ts` — deterministic stand-in for a SALT feasibility response.
- `src/domain/planMeal.ts` — host derivation: combines SALT's response with host context (saved order, itinerary timing notes).
- `src/features/host/` — the trip planner host (use case 01). `src/features/assistant/` — the AI assistant host (use case 02). `src/features/shell/` — the SALT shell (Without/With SALT switch, Highlight toggle) and the rail showing SALT's MCP calls.

Design decisions: see [DESIGN_DIRECTION.md](./DESIGN_DIRECTION.md).

## Design context

Read [SALT_DEMO_DESIGN_CONTEXT.md](./SALT_DEMO_DESIGN_CONTEXT.md) for the research, product boundaries, and open design questions behind the demo. It is context for iteration, not a fixed UI specification.
