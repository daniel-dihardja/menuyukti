import { serve } from '@hono/node-server'
import { Hono } from 'hono'

import mockPayload from './mocks/example.json' with { type: 'json' }

const app = new Hono()

app.get('/health', (c) => c.json({ ok: true }))

app.get('/api/mock', (c) => c.json(mockPayload))
app.get('/api/promotions', (c) => c.json(mockPayload))

const port = Number(process.env.PORT) || 3090

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`mock-server listening on http://127.0.0.1:${info.port}`)
  },
)
