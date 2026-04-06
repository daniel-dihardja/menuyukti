---
name: react-chrono
description: Build interactive React timeline components using the react-chrono library. Use this skill whenever the user wants to create a timeline, chronology, history view, event sequence, roadmap, or any time-based visualization in React. Trigger even if the user doesn't mention react-chrono by name — if they want a timeline in React, this skill applies. Covers all modes (horizontal, vertical, alternating), media (images, videos, YouTube), nested timelines, theming, slideshows, and more.
---

# react-chrono Skill

Build React timeline components with `react-chrono`. Always use the **v3 grouped API** (not deprecated flat props).

## Installation

```bash
pnpm add react-chrono
```

Requirements: React 18.2+ or 19+, Node.js 22+

## Quick Start Pattern

```jsx
import { Chrono } from 'react-chrono';

// ALWAYS wrap in a container with explicit width and height
<div style={{ width: '800px', height: '500px' }}>
  <Chrono items={items} mode="alternating" />
</div>
```

⚠️ **Critical**: The `<Chrono>` component MUST be inside a container with defined `width` and `height`, or it won't render properly.

---

## Timeline Modes

| Mode | Description | Best For |
|------|-------------|----------|
| `"horizontal"` | Left-to-right, navigate with arrows | Slideshows, step-by-step flows |
| `"vertical"` | Top-to-bottom, scrollable | Feeds, news, logs |
| `"alternating"` | Cards alternate left/right (default) | History, milestones, portfolios |
| `"horizontal-all"` | All cards visible horizontally | Comparison, overview |

---

## Items Array Structure

```jsx
const items = [
  {
    title: "January 2024",          // Label on the timeline point (date/label)
    cardTitle: "Product Launch",    // Bold heading on the card
    cardSubtitle: "Version 3.0",    // Smaller subtitle on the card
    cardDetailedText: "Details...", // Body text (or array of strings for paragraphs)
    url: "https://example.com",     // Makes the title a clickable link
    media: {                        // Optional image or video
      type: "IMAGE",                // "IMAGE" or "VIDEO"
      source: { url: "https://..." },
      name: "Alt text / description"
    }
  }
];
```

`cardDetailedText` can be a `string[]` — each string becomes a separate paragraph.

---

## Grouped API (v3 — always use this)

```jsx
<Chrono
  items={items}
  mode="alternating"

  layout={{
    cardWidth: 450,          // px, default 450
    cardHeight: 'auto',      // or a number; 'auto' sizes to content
    pointSize: 16,           // timeline dot size
    lineWidth: 3,            // timeline track width
    responsive: { enabled: true, breakpoint: 768 }
  }}

  interaction={{
    keyboardNavigation: true,  // arrow key nav
    pointClick: true,          // click dot to select
    autoScroll: true,          // scroll to active item
  }}

  content={{
    readMore: true,            // "read more" button for long text
    dateFormat: 'MMM YYYY',    // Day.js format string
    alignment: { horizontal: 'left', vertical: 'top' }
  }}

  display={{
    borderless: false,
    pointShape: 'circle',      // 'circle' | 'square' | 'diamond'
    toolbar: { enabled: true, position: 'top', sticky: false }
  }}

  media={{
    height: 200,               // min height for media
    fit: 'cover',              // CSS object-fit
    align: 'center'
  }}

  animation={{
    slideshow: {
      enabled: false,
      duration: 3000,          // ms per slide
      type: 'fade',            // 'fade' | 'slide' | 'reveal'
    }
  }}

  theme={{
    primary: '#0079e6',
    cardBgColor: '#ffffff',
    cardTitleColor: '#1f2937',
    titleColor: '#374151',
  }}

  onItemSelected={({ item, index }) => console.log(item, index)}
/>
```

---

## Common Patterns

### Minimal timeline (just dates + titles)
```jsx
const items = [
  { title: '2020', cardTitle: 'Founded' },
  { title: '2022', cardTitle: 'Series A' },
  { title: '2024', cardTitle: 'IPO' },
];
<div style={{ width: '100%', height: '400px' }}>
  <Chrono items={items} mode="vertical" />
</div>
```

### Timeline with images
```jsx
{
  title: "June 2023",
  cardTitle: "Mars Rover Landing",
  cardDetailedText: "Perseverance touched down successfully.",
  media: {
    type: "IMAGE",
    source: { url: "https://example.com/mars.jpg" },
    name: "Mars surface"
  }
}
```

### Timeline with YouTube video
```jsx
media: {
  type: "VIDEO",
  source: {
    url: "https://www.youtube.com/embed/VIDEO_ID",
    type: "youtube"
  }
}
```

### Slideshow mode
```jsx
animation={{
  slideshow: { enabled: true, duration: 4000, type: 'fade', autoStart: true }
}}
```

### Nested timelines
```jsx
import { Chrono } from 'react-chrono';

const subItems = [
  { title: 'Phase 1', cardTitle: 'Planning' },
  { title: 'Phase 2', cardTitle: 'Execution' },
];

const items = [{
  title: 'Q1 2024',
  cardTitle: 'Project Alpha',
  // Render a nested Chrono as children
}];

// Pass nested Chrono as children prop:
<Chrono items={items}>
  <Chrono items={subItems} mode="vertical" />
</Chrono>
```

### Custom icons (pass as children with className="chrono-icons")
```jsx
<Chrono items={items}>
  <div className="chrono-icons">
    <img src="/icon1.svg" alt="icon 1" />
    <img src="/icon2.svg" alt="icon 2" />
  </div>
</Chrono>
```

### Dark mode
```jsx
darkMode={{ enabled: true, showToggle: true }}
theme={{
  cardBgColor: '#1f2937',
  cardTitleColor: '#f9fafb',
  primary: '#3b82f6',
  timelineBgColor: '#111827',
}}
```

---

## Theme Properties (most commonly used)

| Property | Description |
|---|---|
| `primary` | Main accent color (dots, active states) |
| `cardBgColor` | Card background |
| `cardTitleColor` | Card title text color |
| `cardSubtitleColor` | Card subtitle text color |
| `titleColor` | Timeline point label color |
| `titleColorActive` | Active timeline point label color |
| `timelineBgColor` | Background of the whole timeline |
| `toolbarBgColor` | Toolbar background |

Full theme reference: see `references/theme.md`

---

## Code Generation Guidelines

When building a `react-chrono` component for a user:

1. **Always** wrap `<Chrono>` in a container with explicit `width` and `height`
2. Use the **v3 grouped API** — never use deprecated flat props like `cardWidth`, `slideShow`, `parseDetailsAsHTML`
3. Choose `mode` based on use case:
   - Historical/milestones → `"alternating"`
   - Feed/log/news → `"vertical"`
   - Steps/wizard → `"horizontal"`
4. Default `cardHeight` to `'auto'` unless the user specifies fixed height
5. Always include `interaction.keyboardNavigation: true` unless user says otherwise
6. For the full list of props, see `references/props-full.md`

---

## Reference Files

- `references/props-full.md` — Complete props reference for all config groups
- `references/theme.md` — All 36 theme properties