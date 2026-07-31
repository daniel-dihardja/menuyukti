'use client'

import dynamic from 'next/dynamic'

const StyleJsonEditorInner = dynamic(
  () => import('./style-json-editor-inner').then((m) => m.StyleJsonEditorInner),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/30 text-muted-foreground min-h-64 rounded-md border border-border/60 p-3 text-sm">
        Loading editor…
      </div>
    ),
  },
)

type StyleJsonEditorProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel: string
}

export function StyleJsonEditor({ value, onChange, disabled, ariaLabel }: StyleJsonEditorProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border/60">
      <StyleJsonEditorInner
        ariaLabel={ariaLabel}
        disabled={disabled}
        onChange={onChange}
        value={value}
      />
    </div>
  )
}
