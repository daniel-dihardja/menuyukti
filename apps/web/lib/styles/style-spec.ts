import { z } from 'zod'

/** Property keys: camelCase identifiers. */
export const STYLE_SPEC_PROPERTY_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/

export const STYLE_SPEC_MAX_PROPERTIES = 30

const propertyParamSchema = z.object({
  type: z.literal('string'),
  requiredWhen: z.string().min(1).nullish(),
  description: z.string().nullish(),
})

const enumPropertyDefSchema = z.object({
  type: z.literal('enum'),
  label: z.string().min(1).nullish(),
  description: z.string().nullish(),
  values: z.array(z.string().min(1)).min(1),
  default: z.string().min(1),
  params: z.record(z.string(), propertyParamSchema).nullish(),
  instructions: z.record(z.string(), z.string().min(1)),
})

const booleanPropertyDefSchema = z.object({
  type: z.literal('boolean'),
  label: z.string().min(1).nullish(),
  description: z.string().nullish(),
  default: z.boolean(),
  instructions: z.object({
    true: z.string().min(1),
    false: z.string().min(1),
  }),
})

const numberPropertyDefSchema = z.object({
  type: z.literal('number'),
  label: z.string().min(1).nullish(),
  description: z.string().nullish(),
  default: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  instruction: z.string().min(1),
})

const textPropertyDefSchema = z.object({
  type: z.literal('text'),
  label: z.string().min(1).nullish(),
  description: z.string().nullish(),
  default: z.string(),
  instruction: z.string().min(1),
})

export const propertyDefSchema = z.discriminatedUnion('type', [
  enumPropertyDefSchema,
  booleanPropertyDefSchema,
  numberPropertyDefSchema,
  textPropertyDefSchema,
])

export type PropertyDef = z.infer<typeof propertyDefSchema>
export type EnumPropertyDef = z.infer<typeof enumPropertyDefSchema>

const styleSpecV2BaseSchema = z.object({
  schemaVersion: z.literal(2),
  properties: z.record(z.string(), propertyDefSchema),
})

function refineStyleSpecV2(
  spec: z.infer<typeof styleSpecV2BaseSchema>,
  ctx: z.RefinementCtx,
): void {
  const keys = Object.keys(spec.properties)
  if (keys.length < 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'properties must contain at least one property',
      path: ['properties'],
    })
  }
  if (keys.length > STYLE_SPEC_MAX_PROPERTIES) {
    ctx.addIssue({
      code: 'custom',
      message: `properties must have at most ${STYLE_SPEC_MAX_PROPERTIES} entries`,
      path: ['properties'],
    })
  }

  for (const key of keys) {
    if (!STYLE_SPEC_PROPERTY_KEY_PATTERN.test(key)) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid property key ${JSON.stringify(key)}`,
        path: ['properties', key],
      })
      continue
    }

    const prop = spec.properties[key]!
    if (prop.type === 'enum') {
      if (!prop.values.includes(prop.default)) {
        ctx.addIssue({
          code: 'custom',
          message: `properties.${key}.default must be one of values`,
          path: ['properties', key, 'default'],
        })
      }
      for (const value of prop.values) {
        if (!prop.instructions[value]?.trim()) {
          ctx.addIssue({
            code: 'custom',
            message: `Missing instruction for ${key}=${value}`,
            path: ['properties', key, 'instructions', value],
          })
        }
      }
    }

    if (prop.type === 'number') {
      if (prop.min != null && prop.default < prop.min) {
        ctx.addIssue({
          code: 'custom',
          message: `properties.${key}.default must be >= min`,
          path: ['properties', key, 'default'],
        })
      }
      if (prop.max != null && prop.default > prop.max) {
        ctx.addIssue({
          code: 'custom',
          message: `properties.${key}.default must be <= max`,
          path: ['properties', key, 'default'],
        })
      }
      if (prop.min != null && prop.max != null && prop.min > prop.max) {
        ctx.addIssue({
          code: 'custom',
          message: `properties.${key}.min must be <= max`,
          path: ['properties', key, 'min'],
        })
      }
    }
  }
}

export const styleSpecSchema = styleSpecV2BaseSchema.superRefine(refineStyleSpecV2)

export type StyleSpec = z.infer<typeof styleSpecSchema>

// --- v1 (read-time migration only) ---

const styleControlDefV1Schema = z.object({
  type: z.literal('enum'),
  values: z.array(z.string().min(1)).min(1),
  default: z.string().min(1),
  description: z.string().nullish(),
  params: z.record(z.string(), propertyParamSchema).nullish(),
  instructions: z.record(z.string(), z.string().min(1)),
})

const styleSpecV1Schema = z.object({
  schemaVersion: z.literal(1),
  kind: z.enum(['template', 'mood']).optional(),
  baseRules: z.array(z.string().min(1)).min(1).max(40).optional(),
  controls: z.record(z.string(), styleControlDefV1Schema),
  defaults: z.record(z.string(), z.string().min(1)),
})

export type StyleSpecV1 = z.infer<typeof styleSpecV1Schema>

/** Migrate v1 controls/defaults to v2 properties (enum-only). Drops kind/baseRules. */
export function migrateStyleSpecV1ToV2(v1: StyleSpecV1): StyleSpec {
  const properties: Record<string, EnumPropertyDef> = {}

  for (const [key, control] of Object.entries(v1.controls)) {
    if (!STYLE_SPEC_PROPERTY_KEY_PATTERN.test(key)) continue
    const defaultValue =
      v1.defaults[key] && control.values.includes(v1.defaults[key]!)
        ? v1.defaults[key]!
        : control.default

    properties[key] = {
      type: 'enum',
      values: control.values,
      default: defaultValue,
      instructions: control.instructions,
      ...(control.description ? { description: control.description } : {}),
      ...(control.params ? { params: control.params } : {}),
    }
  }

  const migrated: StyleSpec = {
    schemaVersion: 2,
    properties,
  }

  const parsed = styleSpecSchema.safeParse(migrated)
  if (!parsed.success) {
    throw new Error(`v1 migration produced invalid v2 spec: ${parsed.error.message}`)
  }
  return parsed.data
}

function coerceInputToV2Candidate(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input
  const raw = input as Record<string, unknown>
  const version = raw.schemaVersion === '1' ? 1 : raw.schemaVersion === '2' ? 2 : raw.schemaVersion

  if (version === 1) {
    const v1Parsed = styleSpecV1Schema.safeParse(input)
    if (v1Parsed.success) {
      return migrateStyleSpecV1ToV2(v1Parsed.data)
    }
  }

  return input
}

// --- Overrides ---

export type PropertyOverride = {
  value: string
  params?: Record<string, string>
}

export type PropertyOverrides = Partial<Record<string, PropertyOverride>>

export type ParsePropertyOverridesResult = {
  overrides: PropertyOverrides
  cleanedPrompt: string
}

const PROPERTY_TAG_RE =
  /\[([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*([^\s\]]+)((?:\s+\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s\]]+))*)\s*\]/gi

const ATTR_RE = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/g

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  let match: RegExpExecArray | null
  ATTR_RE.lastIndex = 0
  while ((match = ATTR_RE.exec(raw)) !== null) {
    out[match[1]!] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return out
}

/** Parse `[headline=none]` / `[accentColor=terracotta text="x"]` from creative direction. */
export function parsePropertyOverrides(prompt: string): ParsePropertyOverridesResult {
  const overrides: PropertyOverrides = {}
  const cleanedPrompt = prompt
    .replace(PROPERTY_TAG_RE, (_full, keyRaw: string, valueRaw: string, attrsRaw: string) => {
      const key = keyRaw.trim()
      if (!STYLE_SPEC_PROPERTY_KEY_PATTERN.test(key)) return _full
      const attrs = parseAttrs(attrsRaw ?? '')
      overrides[key] = {
        value: valueRaw.trim(),
        ...(Object.keys(attrs).length > 0 ? { params: attrs } : {}),
      }
      return ''
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { overrides, cleanedPrompt }
}

/** @deprecated Use parsePropertyOverrides */
export const parseStyleControlOverrides = parsePropertyOverrides

function fillTemplate(template: string, params: Record<string, string | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => {
    const value = params[name]
    return value != null && value !== '' ? value : ''
  })
}

function parseBooleanValue(raw: string): boolean | null {
  const lower = raw.trim().toLowerCase()
  if (lower === 'true' || lower === '1' || lower === 'yes') return true
  if (lower === 'false' || lower === '0' || lower === 'no') return false
  return null
}

function clampNumber(value: number, prop: z.infer<typeof numberPropertyDefSchema>): number {
  let result = value
  if (prop.min != null) result = Math.max(result, prop.min)
  if (prop.max != null) result = Math.min(result, prop.max)
  return result
}

export type CompileStyleSpecResult = {
  body: string
}

function resolveEnumProperty(
  key: string,
  prop: EnumPropertyDef,
  override: PropertyOverride | undefined,
): string | null {
  const rawValue = override?.value ?? prop.default
  const resolved = prop.values.includes(rawValue) ? rawValue : prop.default
  const instruction = prop.instructions[resolved] ?? prop.instructions[prop.default]
  if (!instruction?.trim()) return null

  const params: Record<string, string | undefined> = { ...override?.params }
  const filled = fillTemplate(instruction.trim(), params)
  return `- ${key}: ${resolved} → ${filled}`
}

function resolveBooleanProperty(
  key: string,
  prop: z.infer<typeof booleanPropertyDefSchema>,
  override: PropertyOverride | undefined,
): string | null {
  let resolved = prop.default
  if (override?.value != null) {
    const parsed = parseBooleanValue(override.value)
    if (parsed != null) resolved = parsed
  }
  const instruction = resolved ? prop.instructions.true : prop.instructions.false
  if (!instruction?.trim()) return null
  return `- ${key}: ${resolved} → ${instruction.trim()}`
}

function resolveNumberProperty(
  key: string,
  prop: z.infer<typeof numberPropertyDefSchema>,
  override: PropertyOverride | undefined,
): string | null {
  let resolved = prop.default
  if (override?.value != null) {
    const parsed = Number(override.value)
    if (!Number.isNaN(parsed)) resolved = clampNumber(parsed, prop)
  }
  const filled = fillTemplate(prop.instruction.trim(), { value: String(resolved) })
  return `- ${key}: ${resolved} → ${filled}`
}

function resolveTextProperty(
  key: string,
  prop: z.infer<typeof textPropertyDefSchema>,
  override: PropertyOverride | undefined,
): string | null {
  const resolved = override?.value ?? prop.default
  const filled = fillTemplate(prop.instruction.trim(), { value: resolved })
  return `- ${key}: ${resolved} → ${filled}`
}

/** Compile a Style Spec + overrides into imperative prompt lines. */
export function compileStyleSpec(
  spec: StyleSpec,
  overrides: PropertyOverrides = {},
): CompileStyleSpecResult {
  const propertyLines: string[] = []
  for (const [key, prop] of Object.entries(spec.properties)) {
    const override = overrides[key]
    let line: string | null = null
    switch (prop.type) {
      case 'enum':
        line = resolveEnumProperty(key, prop, override)
        break
      case 'boolean':
        line = resolveBooleanProperty(key, prop, override)
        break
      case 'number':
        line = resolveNumberProperty(key, prop, override)
        break
      case 'text':
        line = resolveTextProperty(key, prop, override)
        break
    }
    if (line) propertyLines.push(line)
  }

  const body =
    propertyLines.length > 0 ? ['PROPERTIES (resolved):', ...propertyLines].join('\n').trim() : ''

  return { body }
}

export function parseStyleSpec(input: unknown): StyleSpec | null {
  const parsed = styleSpecSchema.safeParse(coerceInputToV2Candidate(input))
  return parsed.success ? parsed.data : null
}

export function parseStyleSpecResult(
  input: unknown,
): { ok: true; data: StyleSpec } | { ok: false; issues: z.ZodIssue[] } {
  const parsed = styleSpecSchema.safeParse(coerceInputToV2Candidate(input))
  if (parsed.success) {
    return { ok: true, data: parsed.data }
  }
  return { ok: false, issues: parsed.error.issues }
}

/** Sync `rules` column from compiled property defaults (cap 4000). */
export function rulesFromStyleSpec(spec: StyleSpec): string {
  return compileStyleSpec(spec).body.slice(0, 4000)
}

export function styleSpecParseError(input: unknown): string | null {
  const result = parseStyleSpecResult(input)
  if (result.ok) return null
  return result.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
}
