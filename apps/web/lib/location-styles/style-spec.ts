import { z } from 'zod'

/** Fixed v1 control keys — LLM and overrides cannot invent others. */
export const STYLE_SPEC_CONTROL_KEYS = [
  'headline',
  'productName',
  'backgroundIllustration',
] as const

export type StyleSpecControlKey = (typeof STYLE_SPEC_CONTROL_KEYS)[number]

const controlParamSchema = z.object({
  type: z.literal('string'),
  requiredWhen: z.string().min(1).nullish(),
  description: z.string().nullish(),
})

export const styleControlDefSchema = z.object({
  type: z.literal('enum'),
  values: z.array(z.string().min(1)).min(1),
  default: z.string().min(1),
  description: z.string().nullish(),
  params: z.record(z.string(), controlParamSchema).nullish(),
  instructions: z.record(z.string(), z.string().min(1)),
})

export type StyleControlDef = z.infer<typeof styleControlDefSchema>

export const styleSpecSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.enum(['template', 'mood']),
    baseRules: z.array(z.string().min(1)).min(1).max(40),
    controls: z.object({
      headline: styleControlDefSchema,
      productName: styleControlDefSchema,
      backgroundIllustration: styleControlDefSchema,
    }),
    defaults: z.object({
      headline: z.string().min(1),
      productName: z.string().min(1),
      backgroundIllustration: z.string().min(1),
    }),
  })
  .superRefine((spec, ctx) => {
    for (const key of STYLE_SPEC_CONTROL_KEYS) {
      const control = spec.controls[key]
      if (!control.values.includes(control.default)) {
        ctx.addIssue({
          code: 'custom',
          message: `controls.${key}.default must be one of values`,
          path: ['controls', key, 'default'],
        })
      }
      const defaultValue = spec.defaults[key]
      if (!control.values.includes(defaultValue)) {
        ctx.addIssue({
          code: 'custom',
          message: `defaults.${key} must be one of controls.${key}.values`,
          path: ['defaults', key],
        })
      }
      for (const value of control.values) {
        if (!control.instructions[value]?.trim()) {
          ctx.addIssue({
            code: 'custom',
            message: `Missing instructions for ${key}=${value}`,
            path: ['controls', key, 'instructions', value],
          })
        }
      }
    }
  })

export type StyleSpec = z.infer<typeof styleSpecSchema>

export type StyleControlOverride = {
  value: string
  text?: string
  notes?: string
}

export type StyleControlOverrides = Partial<Record<StyleSpecControlKey, StyleControlOverride>>

export type ParseStyleControlOverridesResult = {
  overrides: StyleControlOverrides
  cleanedPrompt: string
}

const CONTROL_TAG_RE =
  /\[(headline|productName|backgroundIllustration)\s*=\s*([^\s\]]+)((?:\s+\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s\]]+))*)\s*\]/gi

const ATTR_RE = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/g

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  let match: RegExpExecArray | null
  ATTR_RE.lastIndex = 0
  while ((match = ATTR_RE.exec(raw)) !== null) {
    const key = match[1]!.toLowerCase()
    out[key] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return out
}

/** Parse `[headline=none]` / `[productName=custom text="COLD BREW"]` from creative direction. */
export function parseStyleControlOverrides(prompt: string): ParseStyleControlOverridesResult {
  const overrides: StyleControlOverrides = {}
  const cleanedPrompt = prompt
    .replace(CONTROL_TAG_RE, (_full, keyRaw: string, valueRaw: string, attrsRaw: string) => {
      const key = keyRaw as StyleSpecControlKey
      const attrs = parseAttrs(attrsRaw ?? '')
      overrides[key] = {
        value: valueRaw.trim(),
        ...(attrs.text != null && attrs.text !== '' ? { text: attrs.text } : {}),
        ...(attrs.notes != null && attrs.notes !== '' ? { notes: attrs.notes } : {}),
      }
      return ''
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { overrides, cleanedPrompt }
}

function fillTemplate(template: string, params: Record<string, string | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => {
    const value = params[name]
    return value != null && value !== '' ? value : ''
  })
}

export type CompileStyleSpecResult = {
  /** Full STYLE PACK body (without the STYLE PACK header line). */
  body: string
  /** Flat rules text synced for DB preview / legacy fallback. */
  rulesFromBase: string
}

/** Compile a Style Spec + overrides into imperative prompt lines. */
export function compileStyleSpec(
  spec: StyleSpec,
  overrides: StyleControlOverrides = {},
): CompileStyleSpecResult {
  const lines: string[] = []

  for (const rule of spec.baseRules) {
    const trimmed = rule.trim()
    if (trimmed) lines.push(`- ${trimmed}`)
  }

  const controlLines: string[] = []
  for (const key of STYLE_SPEC_CONTROL_KEYS) {
    const control = spec.controls[key]
    const override = overrides[key]
    const value = override?.value ?? spec.defaults[key]
    const resolved = control.values.includes(value) ? value : spec.defaults[key]
    const instruction = control.instructions[resolved] ?? control.instructions[control.default]
    if (!instruction?.trim()) continue
    const filled = fillTemplate(instruction.trim(), {
      text: override?.text,
      notes: override?.notes,
    })
    controlLines.push(`- ${key}: ${resolved} → ${filled}`)
  }

  if (controlLines.length > 0) {
    lines.push('', 'CONTROLS (resolved):', ...controlLines)
  }

  const body = lines.join('\n').trim()
  const rulesFromBase = spec.baseRules
    .map((r) => r.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000)

  return { body, rulesFromBase }
}

export function parseStyleSpec(input: unknown): StyleSpec | null {
  const parsed = styleSpecSchema.safeParse(normalizeAgentStyleSpec(input))
  return parsed.success ? parsed.data : null
}

export function parseStyleSpecResult(
  input: unknown,
): { ok: true; data: StyleSpec } | { ok: false; issues: z.ZodIssue[] } {
  const parsed = styleSpecSchema.safeParse(normalizeAgentStyleSpec(input))
  if (parsed.success) {
    return { ok: true, data: parsed.data }
  }
  return { ok: false, issues: parsed.error.issues }
}

/** Drop JSON nulls so agent dumps with `exclude_none=False` still validate. */
function stripNulls(value: unknown): unknown {
  if (value === null) return undefined
  if (Array.isArray(value)) return value.map(stripNulls)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child === null) continue
      out[key] = stripNulls(child)
    }
    return out
  }
  return value
}

function asInstructionMap(raw: unknown): Record<string, string> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) {
        out[key] = value.trim()
      }
    }
    return out
  }
  if (Array.isArray(raw)) {
    const out: Record<string, string> = {}
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const key = typeof row.value === 'string' ? row.value.trim() : ''
      const instruction =
        typeof row.instruction === 'string'
          ? row.instruction.trim()
          : typeof row.text === 'string'
            ? row.text.trim()
            : ''
      if (key && instruction) out[key] = instruction
    }
    return out
  }
  return {}
}

function normalizeControl(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const control = raw as Record<string, unknown>
  const values = Array.isArray(control.values)
    ? control.values.map((v) => String(v).trim()).filter(Boolean)
    : []
  const instructions = asInstructionMap(control.instructions)
  for (const value of values) {
    if (!instructions[value]?.trim()) {
      instructions[value] = `Apply control mode ${value}.`
    }
  }
  let defaultValue =
    typeof control.default === 'string' && control.default.trim()
      ? control.default.trim()
      : (values[0] ?? 'auto')
  if (values.length > 0 && !values.includes(defaultValue)) {
    defaultValue = values[0]!
  }
  return {
    type: 'enum',
    values: values.length > 0 ? values : ['auto'],
    default: defaultValue,
    instructions,
    ...(typeof control.description === 'string' ? { description: control.description } : {}),
    ...(control.params && typeof control.params === 'object' ? { params: control.params } : {}),
  }
}

/** Coerce common agent/LLM quirks into a Zod-valid Style Spec shape. */
export function normalizeAgentStyleSpec(input: unknown): unknown {
  const stripped = stripNulls(input)
  if (!stripped || typeof stripped !== 'object') return stripped
  const raw = stripped as Record<string, unknown>

  const schemaVersion =
    raw.schemaVersion === 1 || raw.schemaVersion === '1' || raw.schema_version === 1
      ? 1
      : raw.schemaVersion

  const kind =
    raw.kind === 'template' || raw.kind === 'mood'
      ? raw.kind
      : typeof raw.kind === 'string'
        ? raw.kind
        : undefined

  const baseRules = Array.isArray(raw.baseRules)
    ? raw.baseRules.map((r) => String(r).trim()).filter(Boolean)
    : Array.isArray(raw.base_rules)
      ? (raw.base_rules as unknown[]).map((r) => String(r).trim()).filter(Boolean)
      : raw.baseRules

  const controlsRaw =
    raw.controls && typeof raw.controls === 'object'
      ? (raw.controls as Record<string, unknown>)
      : {}

  const controls = {
    headline: normalizeControl(controlsRaw.headline),
    productName: normalizeControl(controlsRaw.productName ?? controlsRaw.product_name),
    backgroundIllustration: normalizeControl(
      controlsRaw.backgroundIllustration ?? controlsRaw.background_illustration,
    ),
  }

  const defaultsRaw =
    raw.defaults && typeof raw.defaults === 'object'
      ? (raw.defaults as Record<string, unknown>)
      : {}

  const pickDefault = (key: StyleSpecControlKey, control: unknown): string => {
    const fromDefaults = defaultsRaw[key]
    if (typeof fromDefaults === 'string' && fromDefaults.trim()) return fromDefaults.trim()
    if (control && typeof control === 'object') {
      const d = (control as Record<string, unknown>).default
      if (typeof d === 'string' && d.trim()) return d.trim()
    }
    return 'auto'
  }

  return {
    schemaVersion,
    kind,
    baseRules,
    controls,
    defaults: {
      headline: pickDefault('headline', controls.headline),
      productName: pickDefault('productName', controls.productName),
      backgroundIllustration: pickDefault(
        'backgroundIllustration',
        controls.backgroundIllustration,
      ),
    },
  }
}

/** Sync `rules` column from Spec baseRules (cap 4000). */
export function rulesFromStyleSpec(spec: StyleSpec): string {
  return compileStyleSpec(spec).rulesFromBase
}

export function styleSpecParseError(input: unknown): string | null {
  const result = parseStyleSpecResult(input)
  if (result.ok) return null
  return result.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
}
