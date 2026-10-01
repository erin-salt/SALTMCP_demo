// Everything the browser can call on the demo's own server, wired once for
// both the Vite dev server and the hosted server.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { createAssistantHandler } from './assistant.ts'
import { costOf, createBudget } from './budget.ts'
import { createLiveHandler, createSaltGateway } from './live.ts'

interface Env { SALT_MCP_KEY?: string; SALT_MCP_URL?: string; ANTHROPIC_API_KEY?: string; ANTHROPIC_WORKSPACE_ID?: string; ASSISTANT_DATA_DIR?: string; ASSISTANT_MONTHLY_USD?: string; ASSISTANT_DAILY_USD?: string }

export function createRoutes(env: Env) {
  const gateway = createSaltGateway({ key: env.SALT_MCP_KEY, url: env.SALT_MCP_URL })
  const live = createLiveHandler({ gateway })
  const budget = createBudget({
    file: join(env.ASSISTANT_DATA_DIR ?? '.data', 'assistant-spend.json'),
    monthlyUsd: Number(env.ASSISTANT_MONTHLY_USD ?? 10),
    dailyUsd: Number(env.ASSISTANT_DAILY_USD ?? 2),
  })
  const assistant = createAssistantHandler({ gateway, budget, apiKey: env.ANTHROPIC_API_KEY, workspaceId: env.ANTHROPIC_WORKSPACE_ID, costOf })

  return (req: IncomingMessage, res: ServerResponse, next?: () => void) => {
    const path = (req.url ?? '').split('?')[0]
    if (path.startsWith('/api/assistant/')) return assistant(req, res)
    return live(req, res, next)
  }
}
