/**
 * Mirrors `apps/agents/agents/core/chat/readable_payload.py` — keep in sync when changing
 * human-readable milestone JSON in chat.
 */

function humanizeKey(key: string): string {
  let step = key.replaceAll('_', ' ')
  step = step.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return step
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'string') {
    const stripped = value.trim()
    if (!stripped) {
      return '-'
    }
    if (stripped.includes('_') && !/[A-Z]/.test(stripped)) {
      return stripped.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }
    return stripped
  }
  return String(value)
}

function linesForKv(key: string, value: unknown, indent: string): string[] {
  const label = humanizeKey(key)
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>
    if (Object.keys(o).length === 0) {
      return [`${indent}- **${label}:** —`]
    }
    const lines = [`${indent}- **${label}:**`]
    for (const [nk, nv] of Object.entries(o)) {
      lines.push(...linesForKv(nk, nv, `${indent}  `))
    }
    return lines
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${indent}- **${label}:** —`]
    }
    const lines = [`${indent}- **${label}:**`]
    lines.push(...formatListLines(value, `${indent}  `))
    return lines
  }
  return [`${indent}- **${label}:** ${formatScalar(value)}`]
}

function formatListLines(items: unknown[], indent: string): string[] {
  if (items.length === 0) {
    return [`${indent}- —`]
  }

  if (items.every((x) => x !== null && typeof x === 'object' && !Array.isArray(x))) {
    const lines: string[] = []
    for (let i = 0; i < items.length; i++) {
      const obj = items[i] as Record<string, unknown>
      lines.push(`${indent}- **Item ${i + 1}**`)
      for (const [nk, nv] of Object.entries(obj)) {
        lines.push(...linesForKv(nk, nv, `${indent}  `))
      }
    }
    return lines
  }

  const lines: string[] = []
  for (let i = 0; i < items.length; i++) {
    const x = items[i]
    if (x !== null && typeof x === 'object' && !Array.isArray(x)) {
      lines.push(`${indent}- **Item ${i + 1}**`)
      for (const [nk, nv] of Object.entries(x as Record<string, unknown>)) {
        lines.push(...linesForKv(nk, nv, `${indent}  `))
      }
    } else if (Array.isArray(x)) {
      lines.push(`${indent}- **Item ${i + 1}**`)
      lines.push(...formatListLines(x, `${indent}  `))
    } else {
      lines.push(`${indent}- ${formatScalar(x)}`)
    }
  }
  return lines
}

/** Format arbitrary JSON-like payload as markdown bullet lines for restaurant marketers. */
export function formatPayloadForChat(payload: unknown, indent = ''): string {
  if (payload !== null && typeof payload === 'object' && !Array.isArray(payload)) {
    const dict = payload as Record<string, unknown>
    const lines: string[] = []
    const hasType = 'type' in dict
    const hasValue = 'value' in dict
    if (hasType || hasValue) {
      const typeVal = dict.type
      if (typeVal !== null && typeVal !== undefined && String(typeVal).trim() !== '') {
        lines.push(`${indent}- **${humanizeKey('type')}:** ${formatScalar(typeVal)}`)
      }
      const valueVal = dict.value
      if (valueVal !== null && typeof valueVal === 'object' && !Array.isArray(valueVal)) {
        for (const [nk, nv] of Object.entries(valueVal as Record<string, unknown>)) {
          lines.push(...linesForKv(nk, nv, indent))
        }
      } else if (valueVal !== undefined) {
        lines.push(...linesForKv('value', valueVal, indent))
      }
      for (const [k, v] of Object.entries(dict)) {
        if (k === 'type' || k === 'value') {
          continue
        }
        lines.push(...linesForKv(k, v, indent))
      }
      return lines.join('\n')
    }

    for (const [k, v] of Object.entries(dict)) {
      lines.push(...linesForKv(k, v, indent))
    }
    return lines.join('\n')
  }

  if (Array.isArray(payload)) {
    return formatListLines(payload, indent).join('\n')
  }

  return `${indent}${formatScalar(payload)}`
}

/** Same structure as agents `tools._format_json_shortcut_section` for preset data blocks. */
export function formatPresetDataMarkdownSection(milestoneTitle: string, payload: unknown): string {
  const lines = [`## Preset data — ${milestoneTitle}`]
  if (payload === null || payload === undefined) {
    lines.push('(not set)')
  } else {
    lines.push(formatPayloadForChat(payload))
  }
  return lines.join('\n')
}
