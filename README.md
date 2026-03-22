# Menuyukti

**Agentic AI platform for data-driven restaurant marketing automation**

![Menuyukti screenshot](./screenshot.png)

Menuyukti turns restaurant sales data into targeted Instagram campaigns. It analyzes historical performance and generates social content for future periods—so restaurants can grow visibility and revenue with less manual work.

## Key features

- **Data-driven campaigns** — Instagram posts from sales trends, menu performance, and seasonal patterns.
- **Agentic AI** — LangChain/LangGraph for multi-step reasoning and content generation.
- **Chat UI** — Generate, refine, and manage marketing content through conversation.
- **Artifacts** — Review, edit, and reuse generated assets (captions, post ideas, etc.).

## Agentic patterns

- **Intent routing** — The main LangGraph classifies each user turn with structured output (e.g. create campaign, location profile, edit venue, or general chat), then **conditionally routes** to the right subgraph or handler—so long-running flows stay separate from Q&A.
- **Planning** — **Plan-and-execute** for the campaign pipeline: the system builds an explicit multi-step plan (data → slots → schedule → formats → brief), then runs a loop that executes each step in order until the plan completes.
- **ReAct** — The **ReAct** pattern (Reason + Act): interleaved reasoning, tool calls, and observation—the model chooses actions step by step from what tools return. This is implemented in addition to plan-and-execute; the two patterns cover different roles in the agent stack.
- **Reflect** — Draft outputs (e.g. location profiles and format plans) pass through **generate → reflect → revise** cycles: a critic step scores or critiques the draft, and the model revises until quality checks pass or a max iteration bound is hit.

## Tech stack

- **Backend:** Python, GraphQL, PostgreSQL — GraphQL API for structured data and analytics.
- **Frontend:** React, Next.js, TypeScript, Node.js.
- **AI:** LangChain, LangGraph, AI SDK, AI Elements — multi-agent orchestration and real-time chat.

## Repo

https://github.com/daniel-dihardja/menuyukti
