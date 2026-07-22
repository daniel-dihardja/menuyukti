import type { EnumPropertyDef, PropertyDef, StyleSpec } from '@/lib/styles/style-spec'

export type StyleUsageProperty = {
  key: string
  label: string
  description?: string
  type: PropertyDef['type']
  summary: string
  exampleTag: string
}

export type StyleUsageGuide = {
  properties: StyleUsageProperty[]
  exampleBrief: string
}

const TEMPLATE_PARAM_RE = /\{\{(\w+)\}\}/g

function extractTemplateParams(instruction: string): string[] {
  const names: string[] = []
  let match: RegExpExecArray | null
  TEMPLATE_PARAM_RE.lastIndex = 0
  while ((match = TEMPLATE_PARAM_RE.exec(instruction)) !== null) {
    const name = match[1]!
    if (!names.includes(name)) names.push(name)
  }
  return names
}

function formatParamAttrs(paramNames: string[]): string {
  return paramNames.map((name) => ` ${name}="…"`).join('')
}

function pickEnumExampleValue(prop: EnumPropertyDef): { value: string; paramNames: string[] } {
  const declaredParams = prop.params ? Object.keys(prop.params) : []

  for (const value of prop.values) {
    const instruction = prop.instructions[value]
    if (!instruction) continue
    const fromTemplate = extractTemplateParams(instruction)
    if (fromTemplate.length > 0) {
      return { value, paramNames: fromTemplate }
    }
  }

  if (declaredParams.length > 0) {
    const custom = prop.values.find((value) => value === 'custom')
    if (custom) {
      return { value: custom, paramNames: declaredParams }
    }
    return { value: prop.default, paramNames: declaredParams }
  }

  return { value: prop.default, paramNames: [] }
}

function buildEnumExampleTag(key: string, prop: EnumPropertyDef): string {
  const { value, paramNames } = pickEnumExampleValue(prop)
  if (paramNames.length === 0) {
    return `[${key}=${value}]`
  }
  return `[${key}=${value}${formatParamAttrs(paramNames)}]`
}

function buildEnumSummary(prop: EnumPropertyDef): string {
  return prop.values.join(' | ')
}

function buildExampleTag(key: string, prop: PropertyDef): string {
  switch (prop.type) {
    case 'enum':
      return buildEnumExampleTag(key, prop)
    case 'boolean':
      return `[${key}=${prop.default ? 'true' : 'false'}]`
    case 'number':
      return `[${key}=${prop.default}]`
    case 'text': {
      const placeholder = prop.default.trim()
      // Main override value cannot contain spaces; use a compact token.
      if (placeholder === '' || placeholder.includes(' ')) {
        return `[${key}=notes]`
      }
      return `[${key}=${placeholder}]`
    }
  }
}

function buildSummary(prop: PropertyDef): string {
  switch (prop.type) {
    case 'enum':
      return buildEnumSummary(prop)
    case 'boolean':
      return `true | false (default ${prop.default})`
    case 'number': {
      const bounds: string[] = []
      if (prop.min != null) bounds.push(`min ${prop.min}`)
      if (prop.max != null) bounds.push(`max ${prop.max}`)
      const range = bounds.length > 0 ? `; ${bounds.join(', ')}` : ''
      return `default ${prop.default}${range}`
    }
    case 'text':
      return prop.default.trim() !== '' ? `default “${prop.default}”` : 'free text'
  }
}

/** Build human-facing usage rows and a pasteable example brief from a Style Spec. */
export function buildStyleUsageGuide(spec: StyleSpec): StyleUsageGuide {
  const properties: StyleUsageProperty[] = Object.entries(spec.properties).map(([key, prop]) => {
    const description = prop.description?.trim() || undefined
    return {
      key,
      label: prop.label?.trim() || key,
      ...(description ? { description } : {}),
      type: prop.type,
      summary: buildSummary(prop),
      exampleTag: buildExampleTag(key, prop),
    }
  })

  return {
    properties,
    exampleBrief: properties.map((property) => property.exampleTag).join('\n'),
  }
}
