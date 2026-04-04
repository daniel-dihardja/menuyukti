# Menuyukti

**Agentic AI platform for data-driven restaurant marketing automation**

![Menuyukti screenshot](./screenshot.png)

Menuyukti turns restaurant sales data into targeted Instagram campaigns. It analyzes historical performance and generates social content for future periods—so restaurants can grow visibility and revenue with less manual work.

## Key features

- **Data-driven campaigns** — Instagram posts from sales trends, menu performance, and seasonal patterns.
- **Agentic AI** — Gentic (Go) agent service for intent routing, ReAct, and multi-step flows.
- **Chat UI** — Generate, refine, and manage marketing content through conversation.
- **Artifacts** — Review, edit, and reuse generated assets (captions, post ideas, etc.).

## Architecture

Menuyukti is split into three cooperating services:

1. **GraphQL data provider** — A Python backend that exposes GraphQL for structured data, analytics, and persistence. The web app and the agents both use this API as the single source of truth for reads and writes.
2. **Web app** — The user-facing application: conversational chat, artifact review and editing, and CRUD-style forms for entities the product manages.
3. **Agent service** — A **Go** HTTP service (**`apps/gentic-agents`**) built on the **Gentic** library: intent routing, ReAct, tools, and campaign/location flows. It calls the GraphQL API when it needs platform data.

## Agentic patterns

- **Intent routing** — The agent service classifies each user turn (e.g. campaign brief, location profile, or general chat), then **routes** to the matching Gentic flow so long-running work stays separate from Q&A.
- **Planning** — **Plan-and-execute** for the campaign pipeline: the system builds an explicit multi-step plan (data → slots → schedule → formats → brief), then runs a loop that executes each step in order until the plan completes.
- **ReAct** — The **ReAct** pattern (Reason + Act): interleaved reasoning, tool calls, and observation—the model chooses actions step by step from what tools return. This is implemented in addition to plan-and-execute; the two patterns cover different roles in the agent stack.
- **Reflect** — Draft outputs (e.g. location profiles and format plans) pass through **generate → reflect → revise** cycles: a critic step scores or critiques the draft, and the model revises until quality checks pass or a max iteration bound is hit.

## Tech stack

- **Backend:** Python, GraphQL, PostgreSQL — GraphQL API for structured data and analytics.
- **Frontend:** React, Next.js, TypeScript, Node.js.
- **AI:** Gentic (Go) for the production agent HTTP service; **Vercel AI SDK** / **AI Elements** on the web for chat UI; optional Python LangChain/LangGraph in other apps where present.
