# Building Menuyukti

## Exploring Agentic AI Through a Real Business Problem

> \*After delivering my first commercial AI project, I wanted to understand something deeper:
>
> **What does it actually take to build an agentic AI system that solves a real business problem?\***

Most AI demos today show what a language model can do.

I wanted to understand something different:

> **What does it take to build software where AI becomes a useful part of someone's daily work?**

Calling an LLM API is relatively easy.

Building a product that people can actually trust, understand and use is much harder.

---

# 1. Motivation

## Why I started this project

After working on a commercial AI project, I became interested in the next challenge: **agentic AI systems**.

I already knew how to integrate language models into production software.

What I didn't yet understand was everything required to build an AI product where autonomous agents solve meaningful business tasks.

I wanted to experience the complete journey myself—not just the implementation.

That meant understanding:

- how to discover a worthwhile business problem
- how to identify where autonomous AI can genuinely create value
- how to design workflows around people rather than technology
- how to orchestrate multiple AI capabilities
- how to integrate agents into production software
- how to evaluate outputs
- how to build interfaces people trust

I wanted every engineering decision to be driven by a real business problem.

To answer that question, I partnered with a real business and built an agentic AI product around an observed operational challenge.

Success wasn't measured by building an impressive demo.

Success meant understanding the complete product journey—from business discovery to a working agentic AI product.

Topics to cover:

- Why this project exists
- Why I wanted to explore agentic systems
- Why tutorials weren't enough
- Why a real customer mattered
- Why I wanted to own the complete product
- Personal learning objectives
- Success criteria
- What I hoped to understand beyond language models

---

# 2. Finding a Real Business Problem

## Start with the business—not the technology

Rather than inventing a project, I partnered with a local restaurant.

The goal wasn't simply to "build an AI application."

The goal wasn't to "use AI".

The goal was to understand the business well enough to discover where an agentic system could make a meaningful difference.

Instead of beginning with technology, I began with observation.

Questions I wanted to answer:

- Where do people spend most of their time?
- Which work creates the most friction?
- Which activities are repetitive?
- Which decisions require creativity?
- Which information already exists?
- Which tasks could benefit from AI while keeping people in control?
- What causes frustration?
- Which work gets postponed?
- Which activities already contain structured information?
- Where could AI genuinely help?

Topics to cover:

- Restaurant collaboration
- Business interviews
- Observing daily operations
- Existing workflows
- Available business data
- Sales history
- Menu structure
- Location
- Customer demographics

Possible visuals:

- Restaurant photos
- Whiteboard sketches
- Journey maps
- Notes
- Sales charts
- Customer observations

---

# 3. Research & Discovery

## Understanding the business

Document your research process.

Examples:

- Sales analysis
- Menu performance
- Seasonal trends
- Local events
- Current marketing process
- Social media activity

Questions you investigated:

- Which dishes sell well?
- Which dishes deserve more attention?
- How often is Instagram updated?
- Who creates the content?
- What takes the most time?
- What information already exists?

This section demonstrates product thinking.

---

# 4. Defining the Problem

## Why Instagram?

This is the turning point.

Describe the moment where everything clicked.

For example:

Sales analysis alone wasn't enough.

Location alone wasn't enough.

Interviews alone weren't enough.

Only after combining multiple perspectives did one pattern emerge.

Restaurant owners know Instagram matters.

Restaurant owners consistently struggled to maintain an active Instagram presence.

Not because they lacked ideas.

But because creating consistent, business-relevant content required significant time and creative effort.

But...

- creating content consistently is difficult
- ideas run out
- posting takes time
- campaigns aren't connected to business goals
- generated content still requires review

At that point the project stopped being:

"Can I build an agentic AI system?"

and became

"How could an agentic system meaningfully support this workflow?"

Most importantly:

AI shouldn't replace the owner.

It should help them produce better campaigns faster while remaining in control.

This becomes your product philosophy.

This is where Menuyukti was born.

Possible diagram:

Business Problem

↓

Pain Points

↓

Product Opportunities

---

# 5. Designing the Solution

## Why Menuyukti looks the way it does

Introduce the product.

Not by showing screenshots first.

Instead explain the reasoning.

Topics:

- Why workflows?
- Why milestones?
- Why structured outputs?
- Why embedded chat?
- Why editable artifacts?
- Why review before publishing?

This is where you connect research with design decisions.

Show screenshots throughout this chapter.

---

# 6. UX Principles

## Designing AI interactions

This chapter explains your UX thinking.

Examples:

- AI should support the task
- The interface should follow the workflow
- Users need visibility into progress
- AI output should remain editable
- Chat is one interaction pattern—not the only one
- AI should increase confidence rather than remove control

This section is valuable because it demonstrates how you think.

---

# 7. Technical Architecture

## Building the product

Only now introduce the technology.

Topics:

- Next.js
- React
- AI SDK
- LangGraph
- FastAPI
- GraphQL
- PostgreSQL
- AWS

Rather than listing technologies, explain decisions.

Examples:

Why LangGraph?

Why GraphQL?

Why streaming?

Why milestone architecture?

Why typed APIs?

Why reusable AI components?

Architecture diagrams work well here.

---

# 8. Engineering Challenges

## Things I underestimated

This section makes the article authentic.

Examples:

- Prompting wasn't the hardest problem.
- UX mattered more than expected.
- Long-running agents needed transparency.
- Structured outputs were more useful than chat history.
- Evaluation became essential.
- Human review couldn't be skipped.

Readers love honest lessons.

---

# 9. Product Evolution

## How the product changed

Show the evolution.

Early concepts.

Wireframes.

Discarded ideas.

Prototype screenshots.

Architecture changes.

This demonstrates iterative product development.

---

# 10. What I Learned

## Reflections

Summarize the biggest lessons.

Examples:

- Start with the problem.
- AI is one capability—not the product.
- UX determines adoption.
- Good workflows matter more than impressive demos.
- Engineering decisions influence trust.
- Building products taught me more than tutorials.

This is probably the most important section.

---

# 11. What's Next

Future work.

Ideas.

Limitations.

Open questions.

Things you'd improve.

Future experiments.

---

# Appendix

## Tech Stack

Keep this concise.

Frontend

Backend

AI

Infrastructure

Deployment

---

# Timeline

Motivation

↓

Research

↓

Problem Discovery

↓

Solution Design

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

Future

---

# Writing Principles

This article is **not** a marketing page.

It is also **not** technical documentation.

Instead it should read like an engineering journal that explains how a real-world problem became a production AI product.

Always answer:

- Why?
- What problem existed?
- What did I learn?
- Why was this decision made?
- What trade-offs existed?
- What would I change today?

Avoid:

- feature lists
- buzzwords
- technology dumping
- exaggerated claims

Instead focus on:

- reasoning
- product thinking
- engineering decisions
- UX decisions
- business context
- lessons learned

The reader should finish the article thinking:

> "This person doesn't just build software.
> He understands how to discover problems, shape products, and engineer thoughtful AI solutions."

---

# Decision Journal

Throughout the article, include short "Decision Journal" callouts.

For example:

## Decision

We chose structured milestones instead of a free-form chat interface.

### Why?

Campaign planning naturally follows a sequence of decisions.
Keeping those decisions visible makes it easier to review, edit, and collaborate.

### Alternatives considered

- Chat-only interface
- Wizard
- Kanban board

### Trade-offs

- Slightly more complex UI
- Much better visibility
- Better long-term editing
