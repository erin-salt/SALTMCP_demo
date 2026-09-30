# SALT customer demo — Phase 1

A deterministic, customer-facing prototype showing how SALT can add restaurant feasibility to a travel product's existing trip and saved-place data.

## Run locally

```bash
npm install
npm run dev
```

No API, MCP server, or backend is used in this phase. SALT responses are simulated from a fixed fixture; **Reset** in the SALT bar restores the starting state.

## Where ownership lives in code

- `src/data/hostProductFixture.ts` — WAYFARER (host) data: trip, itinerary, saves and their provenance.
- `src/salt/simulatedSalt.ts` — deterministic stand-in for a SALT feasibility response.
- `src/domain/planMeal.ts` — host derivation: combines SALT's response with host context (ordering, itinerary timing notes).
- `src/features/wayfarer/` — the host product UI. `src/features/shell/` — the SALT demo shell and the rail showing what crosses the boundary.

## Design context

Read [SALT_DEMO_DESIGN_CONTEXT.md](./SALT_DEMO_DESIGN_CONTEXT.md) for the research, product boundaries, and open design questions behind the demo. It is context for iteration, not a fixed UI specification.
