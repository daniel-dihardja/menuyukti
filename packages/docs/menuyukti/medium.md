# Building Menuyukti

## Exploring Agentic AI Through a Real Business Problem

After working on a commercial AI project, I became interested in building an agentic AI system. I wanted to understand what was required to build one around a real business problem—not only the model integration, but also workflow design, agent orchestration, evaluation, and the product interface around it.

This article documents how that work became **Menuyukti**: a platform that helps a restaurant plan Instagram campaigns—posts, reels, stories, visual assets—and run each step through structured agent milestones with human review.

---

## 1. Motivation

### Why I started this project

The commercial AI project covered language model integration in production: prompts, APIs, guardrails, deployment. The next step I wanted to take was **agentic AI**—systems where agents fetch context, run multiple steps, produce structured output, and return results to a user who reviews them before acting.

I had open questions about how to do that end to end:

- how to find a business problem worth solving
- where multi-step agents add value over a single model call
- how to design the workflow in the product
- how to orchestrate several agent capabilities in one pipeline
- how to integrate agents into production software
- how to evaluate agent output
- how to build an interface operators would actually use

I planned to own the full product surface: discovery, UX, data model, agent service, and deployment. I also wanted a real business involved, so requirements would come from observed work rather than assumptions.

The goal was to go from an operational problem to a working agentic product—not to stop at a prototype that only worked in a demo scenario.

---

## 2. Finding a Real Business Problem

### Start with the business

I partnered with a local restaurant and started by understanding their business before designing software.

I interviewed the owner and staff and observed daily operations: how promotions were decided, where time went during service, and how Instagram work compared to operational tasks like inventory and staffing. I reviewed sales history, menu structure, location context, and customer demographics. I also looked at what the business already knew versus what showed up on social media.

Questions I tracked:

- Where do people spend most of their time?
- Which work creates friction?
- Which activities are repetitive?
- Which decisions need human judgment?
- What structured information already exists?
- Which tasks could use agent support while keeping the owner in control?
- What work gets postponed?
- Where could automation fit without removing review?

Operational work had fixed urgency. Marketing work—especially Instagram—was often deferred. Posting happened in bursts before holidays or events, then dropped off for weeks.

The business had relevant knowledge: top sellers, seasonal patterns, local context. That knowledge lived in conversation, spreadsheets, and habit—not in a repeatable process that connected data to content output.

---

## 3. Research & Discovery

### Understanding the business

I documented the research in concrete terms: sales exports, menu performance notes, seasonal patterns, local events, and a write-up of the current marketing and social media process.

Specific questions:

- Which dishes sell well, and which get less promotion than the data would suggest?
- How often is Instagram updated, and who does the work?
- Where does time go: ideation, photography, copy, scheduling, approval?
- What information already exists that could inform content?

Sales analysis showed which items performed well and which were underrepresented on Instagram. Menu and seasonality pointed to natural campaign themes. The social media review showed irregular posting and no fixed workflow from sales signals to post drafts to visuals to a schedule.

The work was multi-step and the inputs were already structured. That pointed toward an agent pipeline rather than a single generation call.

---

## 4. Defining the Problem

### Why Instagram?

No single data source gave a complete picture.

Sales analysis showed what sold, not how to turn a lunch special into a carousel post six weeks later. Location data added context but did not explain why posting stopped during busy service periods. Interviews surfaced the pain ("we should post more") without a defined workflow.

Combining these sources, one pattern was consistent: the restaurant valued Instagram for discovery and footfall but struggled to keep an active, business-relevant feed.

Concrete friction:

- Posting consistently took more time than was available.
- Content ideas were not tied to sales or campaign goals.
- Campaign planning, copy, visuals, and scheduling were separate manual steps.
- Any generated draft still needed review and often new visuals.

The product question became: **how can an agentic system support that workflow?**

Design constraint I kept throughout: the owner stays in control. The system prepares campaigns and drafts; it does not replace judgment about brand, stock, or timing.

```
Business data (sales, menu, location)
        ↓
Operational friction (time, consistency, disconnected steps)
        ↓
Product scope (guided campaign workflow with review)
```

Menuyukti is the product built around that scope.

---

## 5. Designing the Solution

### Why Menuyukti looks the way it does

Menuyukti is organized as a **campaign workflow**: an ordered list of milestones. Each milestone has a goal, produces structured output, and can define pass criteria that an agent run is checked against.

**Workflows.** Instagram campaign work runs in sequence: define the campaign window, identify promotion candidates, draft post and reel lineups, assign schedule slots. The product reflects that order so each step can use output from the previous one.

**Milestones.** Each step is a bounded unit of agent work with persisted results. For example, a `post_lineup` milestone outputs carousel posts with per-slide fields. A `reel_lineup` milestone outputs short-form concepts with hooks and clip structure. A later `scheduler` milestone reads those structures directly.

**Structured outputs.** Downstream steps consume JSON fields, not free text from a conversation. A reel lineup includes hooks, intent, and schedule hints because the scheduler milestone reads those fields programmatically.

**Embedded chat.** Chat is available for refinement within a campaign. Milestone data and artifacts remain the primary record of what the campaign contains.

**Editable artifacts.** Generated milestone data can be reviewed and edited in the UI. Operators adjust copy, remove items, or change criteria before running the next step.

**Review before publishing.** Each milestone can define pass criteria. After an agent run, an evaluation step scores those criteria. Publishing is out of scope; the product stops at reviewed drafts and assets.

**Assets.** The asset studio handles product photography: upload, background removal, compositing onto backgrounds. Visual work stays in the same campaign context as the post and reel lineups.

---

## Decision Journal

**Structured milestones instead of a single chat surface for the whole campaign.**

### Why

Campaign planning is sequential. Visible milestones make intermediate results easy to inspect and edit. Downstream agent nodes need structured inputs from earlier steps.

### Alternatives considered

- Chat-only interface
- Linear wizard without persisted step output
- Kanban board

### Trade-offs

- More UI complexity
- Better visibility into campaign state
- Easier editing and reuse across campaigns

---

## 6. UX Principles

### Designing AI interactions

These came from early prototypes and feedback on what was hard to use.

**Support the task.** The main flow is campaign planning and content preparation, not open-ended conversation.

**Follow the workflow.** The timeline matches the campaign sequence: brief, formats, schedule.

**Show progress.** Milestone runs report steps while agents work. Long runs are visible in the UI and traceable in LangSmith during development.

**Keep output editable.** Structured results render as previews and editable data, not fixed generations.

**Use chat where it fits.** Chat handles clarification and rewrites. The timeline holds the campaign state.

**Keep the operator in control.** Pass criteria, previews, and explicit evaluation make it clear what an agent run produced and what still needs human judgment.

---

## 7. Technical Architecture

### Building the product

Architecture followed the workflow model above.

### Three services

| Service                                  | Role                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Web** (Next.js, React, AI SDK)         | Workflows, chat, artifacts, asset studio. All product data via GraphQL.                          |
| **GraphQL API** (Strawberry, PostgreSQL) | Campaigns, milestones, analytics, milestone data.                                                |
| **Agents** (FastAPI, LangGraph)          | Milestone runs and streaming chat. GraphQL over HTTP only—no direct database access from agents. |

### LangGraph

Each milestone preset (`post_lineup`, `reel_lineup`, `story_lineup`, `scheduler`, and others) is a separate subgraph: prefetch context from GraphQL, structured LLM calls, optional reflect loops (generate → critique → revise), persist results, then a shared evaluation subgraph.

### GraphQL

Milestone data is nested JSON on workflow nodes. The web app and agents share schema shapes. The web validates with Zod; agent nodes use dedicated prefetch and persist helpers.

### Streaming

Chat streams over SSE via a ReAct graph. Milestone runs emit progress events so the UI can update during longer compositions.

### Typed APIs and shared components

Downstream presets read milestone data, not chat transcripts. Shared schemas between web and agents reduced rework when preset output formats changed. Evaluation, persistence, and markdown formatting are shared agent components; preset subgraphs focus on domain logic.

Analytics run in a shared Python package called from GraphQL. Assets are stored in S3. Auth is handled by Clerk. Runtime is on AWS. Agent runs are traced in LangSmith.

---

## Decision Journal

**Separate agent service from GraphQL.**

### Why

Milestone graphs change frequently and need tracing. GraphQL resolvers stay synchronous and predictable. Schema ownership stays in one service.

### Trade-offs

- Additional service to deploy and authenticate
- Clearer boundaries between data API and agent execution

---

## 8. Engineering Challenges

### What took more effort than expected

**Schema and context, not single-shot prompting.** Writing one caption was straightforward. Producing a five-slide carousel that references a promotion candidate from an earlier milestone required schema design, GraphQL prefetch, and validation.

**UX for structured output.** Preview panels, pass-criteria display, and inline editing needed several iterations.

**Visibility into agent runs.** Debugging preset behavior required milestone run records and LangGraph traces—especially when asking why a specific dish was selected.

**Structured data over chat history.** Later presets depend on milestone JSON. Conversation threads are not a reliable input format for those steps.

**Evaluation.** Pass criteria and a parallel scoring step after each preset run became part of the core loop, not an add-on.

**Human review.** The product generates drafts and assets. Operators still review before anything goes live. That step is intentional, not a gap to close with more automation.

---

## 9. Product Evolution

### How the product changed

The first concept was a single input surface: ask for marketing ideas, copy the result externally. That did not support multi-step campaigns or structured handoff between steps.

The next iteration used a milestone timeline. I dropped a Kanban layout because campaign work is mostly sequential. I dropped a rigid wizard because operators needed to return to earlier steps and edit saved output.

Text generation came before the asset studio. Instagram posts and reels need visuals, so compositing and background removal were added to complete the draft-to-asset path within the same campaign.

On the backend, I moved from one general agent to a preset registry: shared Zod schemas, campaign templates, and one LangGraph subgraph per milestone preset.

---

## 10. What I Learned

- Problem definition from real operations made later technical choices clearer.
- The product is the workflow, data model, and review process—not the model call alone.
- Multi-step agents were justified here because the work was already multi-step and the inputs were structured.
- Interface decisions (timeline, editable artifacts, run visibility) affected usability as much as agent quality.
- Typed milestone schemas and a separate agent service reduced friction when adding presets.
- Shortcuts in early prototypes (unstructured output, skipping criteria) required rework when adding downstream presets.

---

## 11. What's Next

Menuyukti currently covers campaign creation: briefs, post and reel lineups, stories, schedule suggestions, and asset preparation.

Not in scope yet: direct Instagram publishing, feeding post performance back into promotion selection, and multi-location rollups.

Known limitations: asset quality depends on source photography; pass criteria need configuration per milestone; final campaign judgment still rests with the operator.

Planned work includes performance feedback into promotion candidates, more detailed reel storyboards, and workflow templates by venue type.

---

## Appendix: Tech Stack

**Frontend:** Next.js, React, TypeScript, AI SDK, Clerk, next-intl, shadcn/ui.

**Backend:** Strawberry GraphQL, SQLAlchemy, PostgreSQL, Alembic.

**AI:** LangGraph / LangChain on FastAPI, structured outputs, reflect loops, LangSmith, Vercel AI Gateway.

**Analytics:** Shared `menuyukti` Python package—sales transforms, menu signals.

**Infrastructure:** AWS (S3), pnpm/Turborepo monorepo, uv for Python.

**Deployment:** Web, GraphQL, and agents as separate services.

---

## Timeline

```
Motivation
    ↓
Research
    ↓
Problem definition
    ↓
Solution design
    ↓
UX
    ↓
Architecture
    ↓
Implementation
    ↓
Iteration
    ↓
Lessons
    ↓
Future work
```

---

_Menuyukti: [menuyukti.com](https://menuyukti.com)_
