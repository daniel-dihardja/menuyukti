'use client'

import { Info } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { formatCurrencyWithCode } from '@/lib/currency'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@workspace/ui/components/hover-card'
import { Slider } from '@workspace/ui/components/slider'

type Props = {
  sliderValue: number
  onSliderChange: (value: number) => void
  impactItemCount: number
  impactMarginShare: number
  impactMarginAmount: number
  currency: string
  locale: string
}

export function WeakImpactPanel({
  sliderValue,
  onSliderChange,
  impactItemCount,
  impactMarginShare,
  impactMarginAmount,
  currency,
  locale,
}: Props) {
  const t = useTranslations('analytics.weak.impact')

  const sharePct = `${(impactMarginShare * 100).toFixed(1)}%`
  const amount = formatCurrencyWithCode(impactMarginAmount, currency, locale)
  const hasBand = sliderValue > 0 && impactItemCount > 0

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 px-4 py-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <Field className="gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FieldLabel htmlFor="weak-impact-slider" className="text-xs font-medium">
              {t('sliderLabel')}
            </FieldLabel>
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-6">
                  <Info aria-hidden />
                  <span className="sr-only">{t('description')}</span>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="text-sm">{t('description')}</HoverCardContent>
            </HoverCard>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t('sliderValue', { value: sliderValue.toFixed(1) })}
          </span>
        </div>
        <Slider
          id="weak-impact-slider"
          min={0}
          max={10}
          step={0.1}
          value={[sliderValue]}
          onValueChange={([v]) => onSliderChange(v ?? 0)}
          aria-label={t('sliderAriaLabel', { value: sliderValue.toFixed(1) })}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={sliderValue}
          className="w-full"
        />
      </Field>

      <p className="text-sm tabular-nums text-foreground">
        {hasBand
          ? t('summary', {
              count: impactItemCount,
              share: sharePct,
              amount,
            })
          : t('summaryEmpty')}
      </p>
    </div>
  )
}
