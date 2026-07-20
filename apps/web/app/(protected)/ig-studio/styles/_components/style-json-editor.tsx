'use client'

import dynamic from 'next/dynamic'
import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => (
    <div className="bg-muted/30 text-muted-foreground min-h-64 rounded-md border border-border/60 p-3 text-sm">
      Loading editor…
    </div>
  ),
})

type StyleJsonEditorProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel: string
}

export function StyleJsonEditor({ value, onChange, disabled, ariaLabel }: StyleJsonEditorProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border/60">
      <CodeMirror
        value={value}
        height="320px"
        extensions={[json(), EditorView.lineWrapping]}
        editable={!disabled}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
        }}
        onChange={onChange}
        aria-label={ariaLabel}
        className="text-sm"
      />
    </div>
  )
}
