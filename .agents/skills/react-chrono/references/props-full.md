# react-chrono Full Props Reference (v3)

## layout config

| Prop | Type | Default | Notes |
|---|---|---|---|
| `cardWidth` | number | 450 | Max card width in px |
| `cardHeight` | number \| 'auto' | 200 | 'auto' sizes to content |
| `pointSize` | number | 16 | Timeline dot size in px |
| `lineWidth` | number | 3 | Track line width in px |
| `itemWidth` | number | 200 | Horizontal mode section width |
| `timelineHeight` | number \| string | — | Fixed container height |
| `responsive.breakpoint` | number | 768 | Viewport width for mode switch |
| `responsive.enabled` | boolean | true | Auto responsive switching |
| `positioning.cardPosition` | 'top' \| 'bottom' | — | Horizontal mode card position |
| `positioning.flipLayout` | boolean | false | RTL layout flip |

## interaction config

| Prop | Type | Default | Notes |
|---|---|---|---|
| `keyboardNavigation` | boolean | true | Arrow key navigation |
| `pointClick` | boolean | true | Click dot to select |
| `autoScroll` | boolean | true | Scroll to active item |
| `focusOnLoad` | boolean | false | Focus first item on mount |
| `cardHover` | boolean | false | Highlight card on hover |
| `disabled` | boolean | false | Disable all interactions |

## content config

| Prop | Type | Default | Notes |
|---|---|---|---|
| `allowHTML` | boolean | false | Parse HTML in card content |
| `readMore` | boolean | true | "Read more" for long text |
| `textOverlay` | boolean | false | Text over media |
| `dateFormat` | string | 'MMM DD, YYYY' | Day.js format string |
| `compactText` | boolean | false | Compact text display |
| `semanticTags.title` | HTMLTag | 'h3' | h1–h6, span, div |
| `semanticTags.subtitle` | HTMLTag | 'h4' | h1–h6, span, div |
| `alignment.horizontal` | 'left'\|'center'\|'right'\|'stretch' | 'left' | |
| `alignment.vertical` | 'top'\|'center'\|'bottom'\|'stretch' | 'top' | |

## display config

| Prop | Type | Default | Notes |
|---|---|---|---|
| `borderless` | boolean | false | Remove card borders/shadows |
| `cardsDisabled` | boolean | false | Hide cards entirely |
| `pointsDisabled` | boolean | false | Hide timeline dots |
| `pointShape` | 'circle'\|'square'\|'diamond' | 'circle' | |
| `allCardsVisible` | boolean | false | Show all cards (horizontal) |
| `toolbar.enabled` | boolean | true | Show toolbar |
| `toolbar.position` | 'top'\|'bottom' | 'top' | |
| `toolbar.sticky` | boolean | false | Stick toolbar on scroll |
| `scrollable` | boolean \| {scrollbar: boolean} | {scrollbar:false} | Vertical scroll |

## media config

| Prop | Type | Default | Notes |
|---|---|---|---|
| `height` | number | 200 | Min media height in px |
| `align` | 'left'\|'center'\|'right' | 'left' | Media alignment |
| `fit` | 'cover'\|'contain'\|'fill'\|'none'\|'scale-down' | 'cover' | object-fit |

## animation config

| Prop | Type | Default | Notes |
|---|---|---|---|
| `slideshow.enabled` | boolean | false | Enable slideshow |
| `slideshow.duration` | number | 2000 | Ms per slide |
| `slideshow.type` | 'reveal'\|'slide'\|'fade' | 'fade' | Transition type |
| `slideshow.autoStart` | boolean | false | Auto-start on mount |
| `slideshow.showProgress` | boolean | false | Per-card progress bar |
| `slideshow.showOverallProgress` | boolean | true | Overall progress bar |

## style config

```js
style={{
  classNames: {
    card: 'my-card',
    cardTitle: 'my-title',
    cardText: 'my-text',
    timelinePoint: 'my-point',
    timelineTrack: 'my-track',
    controls: 'my-controls',
    title: 'my-label',
  },
  fontSizes: {
    title: '1rem',
    cardTitle: '1.25rem',
    cardSubtitle: '0.9rem',
    cardText: '0.85rem',
  },
  googleFonts: {
    fontFamily: 'Inter',
    elements: {
      cardTitle: { weight: 'bold', size: '1.2rem' },
    },
    preconnect: true,
  }
}}
```

## Event Callbacks

| Callback | Signature | Fires When |
|---|---|---|
| `onItemSelected` | `({ item, index }) => void` | User selects an item |
| `onScrollEnd` | `() => void` | Scroll reaches end |
| `onThemeChange` | `(theme: Theme) => void` | Theme toggled |
| `onRestartSlideshow` | `() => void` | Slideshow loops |

## TimelineItem full interface

```ts
interface TimelineItem {
  title?: string | ReactNode;         // Point label (date/name)
  cardTitle?: string | ReactNode;     // Card heading
  cardSubtitle?: string | ReactNode;  // Card subtitle
  cardDetailedText?: string | string[] | ReactNode | ReactNode[];
  media?: {
    type: 'IMAGE' | 'VIDEO';
    source: { url: string; type?: string };
    name?: string;
  };
  url?: string;             // Title becomes a link
  date?: Date | string | number;
  timelineContent?: ReactNode;  // Fully custom card content
  items?: TimelineItem[];       // Nested timeline items
  active?: boolean;
  id?: string;
}
```