# Menuyukti

**Agentic AI platform for composable data workflows — with restaurant marketing as the flagship product**

![Menuyukti screenshot](./screenshot.png)

At its core, Menuyukti is a **platform for defining and running data workflows**. A **campaign** is a workflow: an ordered sequence of **milestones**, each of which is a working unit. Per milestone, the system can **fetch** the inputs it needs, **instruct an LLM** (and supporting logic) to process that data, and **persist the output** as **milestone data** for the next step or for downstream use. The end goal of a workflow is **structured, reusable data**—not only chat.

That pattern applies broadly to use cases where the deliverable is **data artifacts** (profiles, evaluations, generated text, scored results, etc.). **Menuyukti’s current product** applies it to **data-driven restaurant marketing**: sales and operating signals feed workflows whose outputs support **targeted Instagram-style campaigns**—analytics-informed content with less manual assembly.

## Key features

- **Workflow-oriented campaigns** — Milestones as steps: configurable data preparation, LLM processing, and stored milestone data for evaluation or further processing.
- **Data-driven marketing (product focus)** — Instagram-oriented campaigns from sales trends, menu performance, and seasonal patterns.
- **Agentic AI** — LangGraph / LangChain agent service (`apps/agents`) for chat, milestone prepare/run flows, and skill-driven pipelines.
- **Chat UI** — Navigate the platform, refine outputs, and collaborate through conversation where it fits.
- **Artifacts** — Review, edit, and reuse generated assets (captions, post ideas, etc.).

## Architecture

Menuyukti is split into three cooperating services:

1. **GraphQL data provider** — A Python backend that exposes GraphQL for structured data, analytics, and persistence. The web app and the agents both use this API as the single source of truth for reads and writes.
2. **Web app** — The user-facing application: conversational chat, artifact review and editing, and CRUD-style forms for entities the product manages (campaigns, milestones, and related nodes).
3. **Agent service** — A **Python** FastAPI service (**`apps/agents`**) using LangChain / LangGraph: streaming chat, milestone preparation (e.g. skill-driven generation into milestone data), and milestone evaluation. It calls the GraphQL API over HTTP when it needs platform data.

## Agentic patterns

- **Milestone pipelines** — Work is scoped to **milestones** inside a **campaign** (workflow): fetch context, run model steps, write **milestone data**, then optionally **run** automated evaluation against pass criteria.
- **Planning** — **Plan-and-execute** style flows for richer pipelines: explicit multi-step plans (e.g. data → slots → schedule → formats → brief), executed in order until complete—aligned with the same “staged data” idea at a larger grain.
- **Tool use** — LangGraph graphs and services interleave model steps with tools and GraphQL-backed helpers where needed.
- **Reflect** — Draft outputs (e.g. location profiles and format plans) can pass through **generate → reflect → revise** cycles: a critic step scores or critiques the draft, and the model revises until quality checks pass or a max iteration bound is hit.

## Tech stack

- **Backend:** Python, GraphQL, PostgreSQL — GraphQL API for structured data and analytics.
- **Frontend:** React, Next.js, TypeScript, Node.js.
- **AI:** Python (**`apps/agents`**, LangChain / LangGraph) for the agent HTTP service; **Vercel AI SDK** / **AI Elements** on the web for chat UI.
