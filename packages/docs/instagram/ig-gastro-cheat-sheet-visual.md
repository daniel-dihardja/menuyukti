# IG Gastro Cheat Sheet — Visual Guide

Diagram-first companion to [`ig-gastro-cheat-sheet.md`](./ig-gastro-cheat-sheet.md). Best for **internal / technical onboarding**. Restaurant marketers should start with [`ig-gastro-cheat-sheet-marketers.md`](./ig-gastro-cheat-sheet-marketers.md).

For narrative detail and copy examples, see the [text cheat sheet](./ig-gastro-cheat-sheet.md) and the full [playbook](./instagram-for-gastro.md).

---

## At a glance: the restaurant Instagram stack

```mermaid
flowchart TB
    subgraph profile["Profile — convert intent"]
        U[Username + display name]
        B[Bio + link + contact buttons]
        P[Pinned posts × 3]
        H[Highlights row]
    end

    subgraph feed["Feed — trust + depth"]
        R[Reels — discovery]
        PO[Posts — permanence]
        CA[Carousels — saves + detail]
    end

    subgraph daily["Daily layer"]
        S[Stories — connection + now]
    end

    Guest([Guest discovers you]) --> R
    R --> profile
    PO --> profile
    CA --> profile
    S --> profile
    profile --> Act([Reserve · Order · Walk in · DM])
    S -. save best-of .-> H
```

| Layer                 | Job                               | Lifespan               |
| --------------------- | --------------------------------- | ---------------------- |
| **Reels**             | Reach new people                  | Feed + recommendations |
| **Posts / carousels** | Build trust on your grid          | Permanent              |
| **Stories**           | Stay human and timely             | 24 hours               |
| **Highlights**        | Answer “before I visit” questions | Evergreen              |
| **Profile**           | Turn interest into action         | Always on              |

---

## Profile anatomy

Your profile is a small conversion page. Every block has one job.

```mermaid
block-beta
    columns 3

    block:header:3
        columns 1
        photo["Profile photo\nlogo or iconic dish"]
        name["Display name · cuisine · area"]
        handle["@username"]
    end

    block:bio:3
        columns 1
        line1["1 What you are"]
        line2["2 Where you are"]
        line3["3 Why visit — proof"]
        line4["4 CTA — Reserve / Order / DM"]
        link["Link in bio → 1–3 actions"]
    end

    block:actions:3
        columns 3
        call["Call"]
        email["Email"]
        directions["Directions"]
    end

    block:pins:3
        columns 3
        pin1["Pin 1\nSignature dish"]
        pin2["Pin 2\nSocial proof"]
        pin3["Pin 3\nHow to visit"]
    end

    block:highlights:3
        columns 1
        hl["Highlights row → see diagram below"]
    end
```

**Checklist:** searchable name · correct category (Restaurant / Cafe / Bar) · bio CTA · UTM on link · 3 pins set.

---

## Which format? Decision tree

Start with the **guest moment**, not the content you already shot.

```mermaid
flowchart TD
    Start([What do you need?]) --> Q1{Need to reach\npeople who don't\nfollow you yet?}

    Q1 -->|Yes| Reel[Use a Reel\nreach · hook · 9:16]
    Q1 -->|No| Q2{Personal, casual,\nor happening today?}

    Q2 -->|Yes| Story[Use a Story\nconnection · specials · polls]
    Q2 -->|No| Q3{Must stay on grid\nor earn saves?}

    Q3 -->|Yes| Q4{One image enough?}
    Q4 -->|Yes| Post[Single post]
    Q4 -->|No| Carousel[Carousel post\nmenu · steps · proof]

    Q3 -->|No| Q5{Guest will look this up\nweeks later?}

    Q5 -->|Yes| Highlight[Save to Highlight\n+ optional pin]
    Q5 -->|No| Story

    Reel --> Pair{Offer needs\nfine print?}
    Pair -->|Yes| Also[Also post Story\nor carousel]
    Pair -->|No| Done([Publish])
    Story --> Done
    Post --> Done
    Carousel --> Done
    Highlight --> Done
    Also --> Done
```

### Format × goal (quick matrix)

```mermaid
quadrantChart
    title Format vs guest intent
    x-axis Low effort --> High effort to consume
    y-axis Low urgency --> High urgency
    quadrant-1 Stories
    quadrant-2 Reels
    quadrant-3 Highlights
    quadrant-4 Carousels and posts
```

| Goal                                     | Best format             |
| ---------------------------------------- | ----------------------- |
| New people discover you                  | Reel                    |
| Guest saves for later / compares options | Carousel post           |
| Guest feels connected today              | Story                   |
| Guest acts today (offer, link)           | Story                   |
| Guest looks up info anytime              | Highlight + pinned post |

---

## When to use Reels

```mermaid
flowchart LR
    subgraph reach["Reels = discovery engine"]
        direction TB
        NF[Non-followers]
        EXP[Explore + Reels tab]
        LOC[Local browsers]
    end

    subgraph content["Strong Reel content"]
        direction TB
        A[Appetite — steam, pour, sizzle]
        B[BTS — kitchen, team]
        C[Atmosphere — room, bar, terrace]
        D[One clear idea — 15s max]
    end

    NF --> EXP --> LOC
    content --> reach
    reach --> Profile[Profile visit]
```

**Reel structure (15s)**

```mermaid
gantt
    title Reel timing template
    dateFormat X
    axisFormat %S s

    section Hook
    Strongest visual or line     :0, 2
    section Value
    Dish, moment, or story       :2, 8
    section Proof
    Social signal or benefit     :8, 13
    section CTA
    Reserve, order, follow       :13, 15
```

| Do                          | Don't                              |
| --------------------------- | ---------------------------------- |
| 9:16 vertical, hook in 1–2s | Full menu in one Reel              |
| Subtitles for sound-off     | Forced trends that don't fit brand |
| 1–2/week (small team)       | Promo fine print only in Reel      |

---

## When to use Stories

Stories are the **human layer** — less polished, more present. Not every frame needs a sell.

```mermaid
flowchart TB
    subgraph relational["Relational frames — connection first"]
        direction LR
        W["Happy weekend /\ngood week"]
        T[Thank-you after service]
        Team[Team hello / BTS today]
        Hol[Holiday greetings]
    end

    subgraph action["Action frames — when relevant"]
        direction LR
        Spec[Today's specials]
        Off[Limited offers]
        Avail[Walk-ins / sold out]
        Link[Link sticker — book / order]
    end

    Followers([Followers]) --> relational
    Followers --> action
    relational --> Bond[Trust + familiarity]
    action --> Convert[Today's visit]
    Bond --> Convert
```

**Story mix (example day)**

```mermaid
pie showData
    title Example 4-frame Story day
    "Relational — greeting or team" : 25
    "Today — special or BTS" : 25
    "Engage — poll or question" : 25
    "Action — link or reshare" : 25
```

| Feature         | Use for                       |
| --------------- | ----------------------------- |
| Link sticker    | Reserve, order, event         |
| Poll / question | Menu feedback, FAQs           |
| Countdown       | Launch, brunch, collab dinner |
| Add Yours       | UGC pipeline                  |

**Cadence:** daily on service days · 2–4 frames · save evergreen answers to Highlights.

---

## When to use Posts

Posts are your **permanent storefront** — what new visitors scroll before they decide to visit.

```mermaid
flowchart TD
    Grid[Feed grid] --> Single{One frame\ntells the story?}
    Single -->|Yes| SP[Single image post\nhero dish · award · hiring]
    Single -->|No| CP[Carousel post\nswipe · save · educate]

    CP --> M1[Menus and launches]
    CP --> M2[Step-by-step / multiple dishes]
    CP --> M3[Reviews and social proof]

    SP --> Cap[Caption: Hook → Context → Proof → CTA]
    CP --> Cap
```

**Caption flow**

```mermaid
flowchart LR
    H[Hook] --> C[Context]
    C --> P[Proof]
    P --> CTA[CTA]
```

Example: _"Weekday lunch in 12 minutes → built for nearby offices → top 3 reorders this month → reserve or DM for groups."_

| Cadence    | Small team | Larger team |
| ---------- | ---------- | ----------- |
| Feed posts | 3–4 / week | 5–7 / week  |

---

## Highlights: evergreen navigation

Think of Highlights as a **mini-site** on your profile — not a archive of expired promos.

```mermaid
flowchart TB
    Profile[Profile visitor] --> HL{Which question?}

    HL -->|What can I eat?| Menu[Menu]
    HL -->|How do I book?| Reserve[Reserve / Order]
    HL -->|Where & when?| Loc[Location & hours]
    HL -->|Is it good?| Rev[Reviews / UGC]
    HL -->|Events?| Ev[Events]
    HL -->|Practical?| FAQ[FAQ]

  Menu --> Visit([Ready to visit])
    Reserve --> Visit
    Loc --> Visit
    Rev --> Visit
    Ev --> Visit
    FAQ --> Visit
```

### Baseline Highlight set

```mermaid
block-beta
    columns 6

    block:row:6
        m["Menu"]
        r["Reserve\nOrder"]
        l["Location\n& hours"]
        u["Reviews\nUGC"]
        e["Events"]
        f["FAQ"]
    end
```

**Optional when relevant:** Behind the scenes · Drinks / Wine · New (trim when stale) · About

**Covers:** consistent icons or brand colors · short obvious titles · refresh when menu or hours change.

---

## Guest journey: discovery → visit

How formats map to the funnel.

```mermaid
flowchart LR
    subgraph awareness["Awareness"]
        Reels[Reels]
        Explore[Explore / recommendations]
    end

    subgraph consideration["Consideration"]
        Grid[Grid posts & carousels]
        Saves[Saves & shares]
        HL[Highlights]
    end

    subgraph connection["Connection"]
        Stories[Stories]
        DMs[DMs & comments]
    end

    subgraph conversion["Conversion"]
        Link[Link / reserve / order]
        Visit[Walk-in · booking · order]
    end

    Reels --> Explore --> Grid
    Grid --> Saves --> HL
    Stories --> DMs
    HL --> Link --> Visit
    DMs --> Visit
```

---

## Content mix

Starter ratio before you have your own data (rebalance after 4–6 weeks).

```mermaid
pie showData
    title Starter content mix
    "Trust and brand — team, story, proof" : 40
    "Appetite and engagement — dishes, BTS" : 40
    "Conversion and promo — offers, events" : 20
```

**Leading signals to watch:** saves and shares > likes alone · profile visits · DM starts.

---

## Promotions: do vs don't

```mermaid
flowchart LR
    subgraph good["Do — contextual offer"]
        G1[Reason — lunch / weekday / event]
        G2[Window — days + hours]
        G3[Scope — what applies]
        G1 --> G2 --> G3
    end

    subgraph bad["Don't — vague discount"]
        B1["10% OFF!!!"]
        B2[No daypart]
        B3[No item scope]
        B1 --> B2 --> B3
    end

    good --> Trust[Guest trust]
    bad --> Fatigue[Promo fatigue]
```

Good: _"Lunch offer Mon–Fri, 11:00–14:00 — 10% off mains for nearby offices."_

---

## One-page weekly rhythm (small team)

```mermaid
flowchart TB
    subgraph daily["Every service day"]
        ST[2–4 Story frames\nmix relational + action]
        CM[Reply DMs & comments]
    end

    subgraph weekly["Each week"]
        RE[2× Reel\ndiscovery / appetite]
        FE[3–4× feed post or carousel\ntrust / menu / proof]
    end

    subgraph monthly["Monthly"]
        HL[Refresh Highlights if menu or hours changed]
        PIN[Review pinned posts]
    end

    daily --> weekly --> monthly
```

| When        | What                        |
| ----------- | --------------------------- |
| Mon–Sun     | Stories + community replies |
| 2× / week   | Reel                        |
| 3–4× / week | Post or carousel            |
| Monthly     | Highlights + pins           |

---

## Measurement loop

```mermaid
flowchart LR
    Pub[Publish] --> Lead[Weekly leading signals\nreach · saves · shares · profile visits · DMs]
    Lead --> Biz[Monthly business signals\nreservations · walk-ins · orders · repeats]
    Biz --> Adj[Adjust mix & formats]
    Adj --> Pub
```

Instrument with: UTM links · unique offer codes · “how did you hear about us?” at host stand or checkout.

---

## Related docs

- [IG Gastro Cheat Sheet](./ig-gastro-cheat-sheet.md) — full text reference
- [Instagram for Restaurant Marketers](./instagram-for-gastro.md) — complete playbook
