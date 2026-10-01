# Deploying the shareable demo

The demo runs as one small Fly.io app next to SALT's MCP server. It serves the
built app and a live endpoint (`server/live.ts`) that holds the SALT access key.
The key is a Fly secret: it never reaches the browser or the image.

## First deploy

From this folder, with the Fly CLI installed and logged in (`fly auth login`):

```bash
fly apps create salt-demo            # pick another name if taken, and update fly.toml
grep SALT_MCP_KEY .env.local | fly secrets import --app salt-demo
fly deploy --ha=false
```

`fly secrets import` reads the key from `.env.local` without it appearing in your
shell history. `--ha=false` keeps it to one machine, which the in-memory answer
cache and visitor limits rely on.

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

## Rotating or revoking the key

```bash
fly ssh console --app salt-mcp -C "python -m serving.access revoke salt-demo"
fly ssh console --app salt-mcp -C "python -m serving.access add salt-demo"
# put the new key in .env.local, then:
grep SALT_MCP_KEY .env.local | fly secrets import --app salt-demo
```
