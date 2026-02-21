# Menu Promotion Strategist Agent

A simple AI-powered agent that analyzes menu performance and provides recommendations using Vercel AI SDK.

## Overview

The Menu Promotion Strategist agent demonstrates the new simplified architecture:

- **No microservices** - runs directly in Next.js
- **Vercel AI SDK** - unified LLM abstraction layer
- **Structured outputs** - using Zod schemas
- **Simple & focused** - minimal dependencies, easy to understand

## How It Works

### API Route: `/api/menu-strategist`

```typescript
POST /api/menu-strategist
Body: { analyticsId: number }
Response: { recommendations: { promote: [...], adjust: [...] } }
```

The agent:

1. Fetches analytics and menu items from the database
2. Formats menu performance data (sales quantity, revenue, margin)
3. Calls OpenAI's gpt-4o-mini with structured prompt
4. Returns Zod-validated recommendations

### UI Page: `/menu-strategist`

Simple interface to:

- Select an analytics dataset
- Generate recommendations
- View promote/adjust items with impact badges

## Architecture Pattern

```
User Request
    ↓
Next.js Route (/api/menu-strategist)
    ↓
Vercel AI SDK (generateObject)
    ↓
OpenAI Model
    ↓
Zod Schema Validation
    ↓
JSON Response
```

## Key Features

- ✅ **Type-safe**: Zod schemas validate all outputs
- ✅ **Simple**: ~100 lines of agent logic
- ✅ **No framework overhead**: Direct Next.js route
- ✅ **Production ready**: Proper error handling
- ✅ **Easy to extend**: Add new agents using same pattern

## Building More Agents

To create another agent:

1. Create new route: `/app/api/[agent-name]/route.ts`
2. Use `generateObject` or `generateText` from ai SDK
3. Define Zod schema for output
4. Create UI page: `/app/[agent-name]/page.tsx`

That's it! No complex orchestration, no microservices, just simple Next.js routes + AI SDK.

## Next Steps

- Add more agents (inventory optimizer, price strategist, etc.)
- Enhance UI with ai-elements components
- Add streaming responses with `streamObject`
- Implement agent-to-agent communication via API calls
