'use client'

import { useTranslations } from 'next-intl'

import { STYLE_SPEC_CONTROL_KEYS, type StyleSpec } from '@/lib/styles/style-spec'

export function StyleSpecReadOnlyPanel({ styleSpec }: { styleSpec: StyleSpec }) {
  const t = useTranslations('igStudio.styles')
  const kindLabel = styleSpec.kind === 'template' ? t('kindTemplate') : t('kindMood')

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
          {t('controlsSectionTitle')}
        </p>
        {STYLE_SPEC_CONTROL_KEYS.map((key) => {
          const control = styleSpec.controls[key]
          const defaultValue = styleSpec.defaults[key]
          return (
            <div key={key} className="space-y-1.5">
              <p className="text-sm font-medium">{t(`controls.${key}`)}</p>
              <p className="text-muted-foreground text-xs">
                {t('controlDefault', { value: defaultValue })}
              </p>
              <ul className="space-y-2">
                {control.values.map((value) => (
                  <li key={value} className="text-sm">
                    <span className="font-medium">{value}</span>
                    <span className="text-muted-foreground"> — </span>
                    <span className="text-muted-foreground">
                      {control.instructions[value] ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
