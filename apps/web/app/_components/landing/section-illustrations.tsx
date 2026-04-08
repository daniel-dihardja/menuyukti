type IllustrationProps = {
  /** When false, the SVG is exposed to assistive tech (use with an external caption). */
  decorative?: boolean
}

/** Theme-aware illustrations for problem/solution sections. */
export function AnalyticsIllustration({ decorative = true }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 600"
      className="h-auto w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={decorative ? true : undefined}
    >
      <rect width="800" height="600" rx="16" className="fill-muted/50 stroke-border" strokeWidth="1" />
      <rect x="40" y="40" width="720" height="48" rx="8" className="fill-card stroke-border" strokeWidth="1" />
      <rect x="60" y="56" width="96" height="16" rx="4" className="fill-muted-foreground/25" />
      <g transform="translate(60 140)">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect
            key={i}
            x={i * 112}
            y={260 - (40 + i * 28)}
            width="72"
            height={40 + i * 28}
            rx="6"
            className="fill-primary/70"
          />
        ))}
      </g>
      <rect x="480" y="120" width="260" height="200" rx="12" className="fill-card stroke-border" strokeWidth="1" />
      <circle cx="610" cy="200" r="40" className="fill-primary/20 stroke-primary/40" strokeWidth="2" />
      <path
        d="M590 210 L605 225 L635 185"
        className="stroke-primary"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="500" y="260" width="220" height="10" rx="3" className="fill-muted-foreground/20" />
      <rect x="500" y="280" width="160" height="10" rx="3" className="fill-muted-foreground/15" />
    </svg>
  )
}

export function WorkflowIllustration({ decorative = true }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 600"
      className="h-auto w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={decorative ? true : undefined}
    >
      <rect width="800" height="600" rx="16" className="fill-muted/50 stroke-border" strokeWidth="1" />
      <g transform="translate(80 200)">
        <rect width="160" height="120" rx="12" className="fill-card stroke-border" strokeWidth="1" />
        <rect x="40" y="36" width="80" height="12" rx="4" className="fill-muted-foreground/30" />
        <rect x="48" y="60" width="64" height="40" rx="6" className="fill-muted-foreground/20" />
      </g>
      <path
        d="M 260 260 L 320 260"
        className="stroke-primary/60"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M 310 250 L 330 260 L 310 270" className="stroke-primary/60" strokeWidth="3" fill="none" />
      <g transform="translate(340 200)">
        <rect width="160" height="120" rx="12" className="fill-card stroke-primary/40" strokeWidth="2" />
        <rect x="32" y="40" width="96" height="14" rx="4" className="fill-primary/35" />
        <rect x="40" y="64" width="80" height="36" rx="6" className="fill-primary/15" />
      </g>
      <path
        d="M 520 260 L 580 260"
        className="stroke-primary/60"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M 570 250 L 590 260 L 570 270" className="stroke-primary/60" strokeWidth="3" fill="none" />
      <g transform="translate(600 200)">
        <rect width="160" height="120" rx="12" className="fill-card stroke-border" strokeWidth="1" />
        <rect x="24" y="32" width="112" height="56" rx="8" className="fill-muted-foreground/15" />
        <rect x="32" y="96" width="32" height="8" rx="2" className="fill-primary/40" />
        <rect x="72" y="96" width="32" height="8" rx="2" className="fill-primary/40" />
        <rect x="112" y="96" width="32" height="8" rx="2" className="fill-primary/40" />
      </g>
    </svg>
  )
}
