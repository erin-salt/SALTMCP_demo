# SALT customer demo — Phase 1

A deterministic, customer-facing prototype showing how SALT can add restaurant feasibility to a travel product's existing trip and saved-place data.

The demo is shown inside **Wayfarer**, a fictional travel app that stands in for a SALT customer. Wayfarer owns the trip, the itinerary and the user's saved restaurants. SALT contributes venue signals (operating status and availability), and Wayfarer decides how to present them.

## What the demo shows

1. **Before SALT:** a Boston weekend itinerary with two open meal times (Saturday dinner, Sunday lunch) and ten saved restaurants from TikTok, friends, AI suggestions and so on. Nothing tells the user whether any of them actually work for this trip.
2. **The check:** the user clicks *Check my saved restaurants*.
3. **After SALT:** the itinerary and saved list show which places have a time that fits, which only have an alternative time, which have nothing that matches, and which are permanently closed. The user can add a restaurant to an open meal slot.
4. **How this works:** a panel showing what the host product provided, what SALT added, and what the prototype orchestration derived.

Every result is pre-set fixture data. No live SALT request is made, and nothing is booked.

## Run locally

Requires Node.js 20.19 or later (dependencies track the latest Vite).

```bash
npm install
npm run dev
```

| Command         | What it does                       |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start the Vite dev server          |
| `npm run build` | Type-check and build to `dist/`    |
| `npm run lint`  | Run ESLint                         |
| `npm test`      | Run the Vitest unit tests          |

No API, MCP server or backend is used in this phase.

## Project structure

```
src/
  App.tsx                     Page shell and demo state (initial → checking → results)
  config.ts                   Feature flags (LIVE_CHAT_ENABLED, off by default)
  data/
    hostProductFixture.ts     Data the host product owns: trip, itinerary, saved restaurants
    saltDemoFixture.ts        Simulated SALT responses: operating status and availability
  domain/
    demoTypes.ts              Shared types
    deriveTripFeasibility.ts  Combines host data with SALT data into what the UI shows
  features/
    itinerary/                Trip days and open meal slots
    savedRestaurants/         Saved list with feasibility states
    howItWorks/               Integration explainer panel
    liveChat/                 Placeholder for a future live SALT proof
```

The split between `hostProductFixture.ts` and `saltDemoFixture.ts` mirrors the product boundary: anything the customer would already have lives in the first file, and anything SALT would return lives in the second. `deriveTripFeasibility.ts` plays the role of the host or orchestration layer. For example, it spots that Zuma's only available time matches the trip, which is a host-side insight rather than a SALT capability.

## Changing the demo

- **Scenario data:** edit the two fixture files. Keep them consistent with each other and with what SALT can actually return.
- **Live chat:** set `LIVE_CHAT_ENABLED` in `src/config.ts` to show the *Try SALT live* button. It is a placeholder and not wired to anything yet.

## Design context

Read [SALT_DEMO_DESIGN_CONTEXT.md](./SALT_DEMO_DESIGN_CONTEXT.md) before changing the demo. It covers the research, the product boundaries, what SALT must not be shown doing, and the criteria for judging an iteration. It is context for iteration, not a fixed UI specification.
