# Data workflows: campaigns and milestones

This document describes how Menuyukti models **workflows** as **campaigns** and **milestones**, and how the pieces of a workflow fit together. The same pattern applies whenever the goal is to produce and validate **data** through staged steps—not only for marketing use cases.

## Campaign as a flow

A **campaign** is the top-level container for a workflow. It is scoped to a **location** (for example, one restaurant) and holds **one or more milestones**.

Think of the campaign as the **flow**: an ordered pipeline where the whole initiative has a **single north star**, and each stage has its own objective, inputs, outputs, and quality checks.

**Persistence:** The top-level container is a **`node`** row whose GraphQL **`nodeType`** (database column **`type`**) is **`workflow`**. Milestones are children of that root. Product copy may still say “campaign”; the stored polymorphic type name is `workflow`.

### Root goal (workflow level)

A workflow **should** expose a **root goal**: one clear statement of **why this campaign exists** and **what success means** at the level of the whole flow—not only inside individual milestones.

- **Why it matters:** It aligns every milestone, criterion, and artifact with the same outcome; it makes reporting and handoffs intelligible (“did this workflow achieve its purpose?”); it gives assistants and automation a stable anchor for suggestions and validation.
- **Relationship to milestone goals:** The **root goal** is the **parent intent**. Each milestone’s **goal** (below) is a **step-level** commitment that should **support** the root goal. If a step cannot be traced back to the root goal, the workflow is likely mis-scoped or the step should be reconsidered.

**Product note:** Persisting and surfacing a **campaign-level root goal** in the UI (and in APIs the agents use) is an **important capability to implement**. Until then, teams may still capture an informal root goal outside the product; the model below is the **target** behavior.

### What stays on milestones

**Pass criteria**, **milestone data**, **Run**, and **per-milestone results** remain **milestone-scoped**—that is where measurable checks and generated text for a single step live. The root goal does **not** replace milestone goals; it **frames** them.

## Milestones as steps

Each **milestone** is a **working unit** in that flow:

- Milestones have a display **order** (sequence of steps).
- Only the **last** milestone in order can be deleted (LIFO); removing a milestone removes its dependent pieces (goal, criteria, data, result).

Downstream milestones can depend on **milestone data** produced earlier in the same campaign (conceptually: later steps consume or build on earlier artifacts), even though persistence is modeled **per milestone** in the product.

## Parts of a milestone

Every milestone is made of four conceptual parts, backed by nodes in the system.

### 1. Goal (step goal)

- **What it is:** A short statement of what **this step** should achieve, in plain language—**in service of the workflow’s root goal**.
- **Cardinality:** At most **one** goal per milestone.
- **Where it lives:** The milestone’s **Goal** tab; stored as a `goal` field on the goal node.
- **Alignment:** Step goals should be **checkable against** the root goal (e.g. “this milestone advances X so we can eventually achieve Y,” where Y is the root goal).

### 2. Pass criteria

- **What they are:** **Measurable checks** that say whether the milestone data satisfies the step (requirements written as pass/fail-able statements).
- **Cardinality:** **One or more** criteria per milestone.
- **Where they live:** The **Pass criteria** tab; each row has a **requirement** and a **status** (`pass`, `fail`, or `open`).
- **Automation:** You define **requirements** only. **Run** (see below) evaluates the milestone data against each requirement and updates **status**. Status can also reflect the last evaluation after a run.

### 3. Data (milestone data)

- **What it is:** The **payload** this step produces or holds—the string that **Run** evaluates against the pass criteria.
- **Cardinality:** At most **one** milestone data record per milestone (one `data` string).
- **How it is produced (data task):**
  - **Manual entry** — The user writes or pastes content in the **Data** tab; no Prepare step.
  - **Generate location profile** — A **Prepare** pipeline fetches analytics and related context, then an LLM turns it into markdown-style text; the user can edit afterward.

In both cases the same milestone data node stores the final **`data`** string; the difference is **authored entirely by the user** vs **started from a generated profile**.

### 4. Result

- **What it is:** The **output of evaluation** after **Run**: whether the step passed the criteria, plus a short summary and per-criterion outcomes where applicable.
- **Cardinality:** At most **one** result per milestone.
- **Fields (conceptually):** Summary, counts of passed vs total criteria, and optional per-criterion detail.

Together, the **root goal** (workflow) and **step goal** (milestone) set direction; **pass criteria** define _what “good” looks like_ for that step; **data** is the artifact; **result** is the automated verdict on that artifact.

## Typical lifecycle inside one milestone

1. Ensure the **workflow root goal** is set (once per campaign, when implemented in product).
2. Set the **milestone (step) goal** and add **pass criteria** (requirements only).
3. Fill **data**: manual entry, or choose **Generate location profile** and run **Prepare** to generate, then edit if needed.
4. **Run** to evaluate the data against the criteria, update statuses, and write the **result**.

Repeat for the next milestone in order as the workflow progresses.

---

## Example: Instagram-oriented campaign for a restaurant

The following is an **illustrative** breakdown. Names and criteria are examples; your real campaigns should match your operating model and compliance needs.

### Root goal (whole workflow)

**Example:** “Grow weekday lunch covers by 15% this quarter using Instagram-only touchpoints, without discounting core star items.”

Everything below should be **traceable** to that sentence: each milestone advances a slice of work that rolls up to this outcome.

### Milestone 1 — Location and audience context

| Part              | Example                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Step goal**     | Capture a trustworthy snapshot of the venue, trade patterns, and audience so later content stays on-brand and data-backed—supporting lunch-focused, margin-safe messaging.        |
| **Pass criteria** | e.g. “Mentions primary cuisine and service style”; “Includes at least one concrete insight from sales or traffic patterns”; “States posting constraints (tone, topics to avoid).” |
| **Data**          | A markdown-style **location profile** produced via **Prepare** (location profile data task), optionally edited by the user.                                                       |
| **Result**        | Automated check that the profile is complete enough for the next step to rely on.                                                                                                 |

### Milestone 2 — Content themes and guardrails

| Part              | Example                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Step goal**     | Turn the profile into **themes and guardrails** that favor weekday lunch discovery and star items—aligned with the root goal.                                             |
| **Pass criteria** | e.g. “Lists 3–5 themes aligned with the profile”; “Explicitly references at least two high-level business goals (e.g. margin, discovery)”; “No contradictory tone rules.” |
| **Data**          | Often **manual** or pasted from a workshop—could also be drafted elsewhere and pasted into the Data tab.                                                                  |
| **Result**        | Confirms the theme brief is internally consistent before post-level work.                                                                                                 |

### Milestone 3 — Post or slot plan (calendar-level)

| Part              | Example                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Step goal**     | Produce a **schedule of posts** that allocates capacity to weekday lunch and star-menu storytelling within the campaign window.               |
| **Pass criteria** | e.g. “Covers the planned window”; “Each slot ties to a theme from milestone 2”; “Mix respects content mix rules if you encoded them in data.” |
| **Data**          | Structured or semi-structured text (table, list)—whatever your process uses, stored as the milestone **data** string.                         |
| **Result**        | Validates that the plan is complete and traceable to the earlier milestones.                                                                  |

### Milestone 4 — Creative pack or final QA

| Part              | Example                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Step goal**     | Deliver **captions / hooks / asset notes** ready for publishing, still aligned with lunch growth and margin guardrails. |
| **Pass criteria** | e.g. “Each planned slot has copy”; “No unsubstantiated claims”; “CTA and hashtags match guardrails.”                    |
| **Data**          | The consolidated creative text or references—still one **`data`** payload for **Run** to score.                         |
| **Result**        | Final pass/fail (or partial pass) before the team treats the workflow as done for that period.                          |

This shows how a single **Instagram campaign** for a restaurant can be modeled as a **flow**: a **root goal** sets the outcome; early milestones lock **context** and **strategy**, middle milestones lock **planning**, and later milestones lock **execution-ready data**. Each step still uses the same building blocks—**step goal**, **criteria**, **data**, **result**—nested under that root intent.

---

## See also

- Root [`README.md`](../../../README.md) — product and architecture overview.
- [`post-schedule.md`](../post-schedule.md) — deeper agentic layering ideas for scheduling and content (complementary to the milestone model).
