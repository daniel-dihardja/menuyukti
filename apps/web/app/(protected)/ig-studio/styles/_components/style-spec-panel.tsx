'use client'

import { useTranslations } from 'next-intl'

import type { PropertyDef, StyleSpec } from '@/lib/styles/style-spec'

function formatDefault(prop: PropertyDef): string {
  switch (prop.type) {
    case 'boolean':
      return String(prop.default)
    case 'number':
      return String(prop.default)
    case 'text':
      return prop.default || '—'
    case 'enum':
      return prop.default
  }
}

function PropertyDetail({ propertyKey, prop }: { propertyKey: string; prop: PropertyDef }) {
  const t = useTranslations('igStudio.styles')
  const title = prop.label?.trim() || propertyKey
  const typeLabel = t(`propertyType.${prop.type}`)

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-sm font-medium">{title}</p>
        <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-xs">
          {typeLabel}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        {t('controlDefault', { value: formatDefault(prop) })}
      </p>
      {prop.type === 'enum' ? (
        <ul className="space-y-2">
          {prop.values.map((value) => (
            <li key={value} className="text-sm">
              <span className="font-medium">{value}</span>
              <span className="text-muted-foreground"> — </span>
              <span className="text-muted-foreground">{prop.instructions[value] ?? ''}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {prop.type === 'boolean' ? (
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">true</span>
            <span className="text-muted-foreground"> — </span>
            <span className="text-muted-foreground">{prop.instructions.true}</span>
          </li>
          <li>
            <span className="font-medium">false</span>
            <span className="text-muted-foreground"> — </span>
            <span className="text-muted-foreground">{prop.instructions.false}</span>
          </li>
        </ul>
      ) : null}
      {prop.type === 'number' || prop.type === 'text' ? (
        <p className="text-muted-foreground text-sm">{prop.instruction}</p>
      ) : null}
    </div>
  )
}

export function StyleSpecReadOnlyPanel({ styleSpec }: { styleSpec: StyleSpec }) {
  const t = useTranslations('igStudio.styles')
  const kindLabel = styleSpec.kind === 'template' ? t('kindTemplate') : t('kindMood')
  const propertyEntries = Object.entries(styleSpec.properties)

  return (
    <div className="space-y-3 rounded-md border border-border/50 bg-muted/20 p-3">
      <p className="text-sm font-medium">{t('specPanelTitle')}</p>

      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t('kindLabel')}
        </p>
        <p className="text-sm">{kindLabel}</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t('baseRulesLabel')}
        </p>
        <ul className="list-disc space-y-1 pl-4 text-sm">
          {styleSpec.baseRules.map((rule, index) => (
            <li key={`${index}-${rule}`}>{rule}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t('propertiesSectionTitle')}
        </p>
        {propertyEntries.map(([key, prop]) => (
          <PropertyDetail key={key} propertyKey={key} prop={prop} />
        ))}
      </div>
    </div>
  )
}
