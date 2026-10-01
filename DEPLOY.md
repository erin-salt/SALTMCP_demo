# Deploying the shareable demo

The demo runs as one small Fly.io app next to SALT's MCP server. It serves the
built app, a live endpoint (`server/live.ts`) that holds the SALT access key, and
the live AI assistant (`server/assistant.ts`) that holds an Anthropic API key.
Both keys are Fly secrets: they never reach the browser or the image.

## First deploy

From this folder, with the Fly CLI installed and logged in (`fly auth login`):

```bash
fly apps create salt-demo            # pick another name if taken, and update fly.toml
fly volumes create assistant_data --size 1 --region iad --app salt-demo
grep -E '^(SALT_MCP_KEY|ANTHROPIC_API_KEY|ANTHROPIC_WORKSPACE_ID|GOOGLE_MAPS_BROWSER_KEY)=' .env.local | fly secrets import --app salt-demo
fly deploy --ha=false
```

`fly secrets import` reads the keys from `.env.local` without them appearing in
your shell history. `--ha=false` keeps it to one machine, which the in-memory
answer cache, visitor limits and the spend file on the volume rely on.

Use an Anthropic API key created inside a workspace. A key that isn't scoped
to a workspace also needs `ANTHROPIC_WORKSPACE_ID` (import it the same way).

`GOOGLE_MAPS_BROWSER_KEY` draws the assistant's Google map. It is served to the
browser at runtime (`/api/config`), as map keys are meant to be: in Google Cloud,
restrict it to the Maps JavaScript API and to `http://localhost:5173/*` and the
app's Fly address (e.g. `https://salt-demo.fly.dev/*`), and set a daily quota on
map loads. Without it the assistant shows a schematic stand-in map. The map
script loads only on the assistant tab, once per visit; Google's own place icons
can't be clicked, so no other Google calls are made from the browser.


Before sharing the link, set a monthly spend limit on the Anthropic workspace
the key belongs to (Console → Settings → Limits). That is the cap Anthropic
enforces; the app's own guard (below) is a second line.

Then open `https://salt-demo.fly.dev` and check `https://salt-demo.fly.dev/health`.

## Later deploys

```bash
fly deploy --ha=false
```

## How live mode protects the key and SALT

- The endpoint only answers about the demo's ten saved places, for dates in the
  next 60 days, sensible times and party sizes. It is not a general SALT gateway.
- Identical questions within 90 seconds share one answer (SALT does the same).
- Each visitor is limited to 20 live requests a minute; SALT's own limit for the
  demo key is 60 venue checks a minute across everyone.
- Live is the default; viewers can switch to **Simulated** in the SALT bar.

## How the live assistant stays inside its budget and its lane

- Claude (Opus 5.5) writes the replies; every fact is shown from SALT's own
  results. It can search SALT's Back Bay directory (by name, street, status,
  reservations, live support) and check tables for any venue in it, nothing
  else. The directory is gathered from `search_venues` once an hour and cached.
- Each reply is priced from Claude's usage and added to `/data/assistant-spend.json`.
  At $10 a month (`ASSISTANT_MONTHLY_USD`) or $2 a day (`ASSISTANT_DAILY_USD`) it
  stops calling Claude and says so; the rest of the demo keeps working.
- Each visitor gets 12 assistant messages per 5 minutes; a reply makes at most 4
  Claude calls and 6 SALT tool calls.
- With SALT switched off, the assistant answers from the saves alone without
  calling Claude.
- Without `ANTHROPIC_API_KEY` the AI assistant tab falls back to the scripted
  version.

## Rotating or revoking the key

```bash
fly ssh console --app salt-mcp -C "python -m serving.access revoke salt-demo"
fly ssh console --app salt-mcp -C "python -m serving.access add salt-demo"
# put the new key in .env.local, then:
grep SALT_MCP_KEY .env.local | fly secrets import --app salt-demo
```
