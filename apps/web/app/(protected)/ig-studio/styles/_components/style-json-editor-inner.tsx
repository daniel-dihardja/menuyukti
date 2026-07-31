'use client'

import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'

type StyleJsonEditorInnerProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel: string
}

export function StyleJsonEditorInner({
  value,
  onChange,
  disabled,
  ariaLabel,
}: StyleJsonEditorInnerProps) {
  return (
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
  )
}
