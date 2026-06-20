'use client'

import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  BRIEF_PROFILE_FIELD_COUNT,
  BRIEF_TEXT_MAX_LENGTHS,
  briefHintsHasAnySelection,
  type BriefHintsState,
} from '@/lib/location-quick-profile'
import { Button } from '@workspace/ui/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import { Progress } from '@workspace/ui/components/progress'
import { TabsContent } from '@workspace/ui/components/tabs'
import { Textarea } from '@workspace/ui/components/textarea'

export type LocationBriefSectionProps = {
  loading: boolean
  hints: BriefHintsState
  profileFilledCount: number
  profileProgress: number
  onHintFieldChange: <K extends keyof BriefHintsState>(key: K, value: BriefHintsState[K]) => void
  onResetHints: () => void
}

export function LocationBriefSection({
  loading,
  hints,
  profileFilledCount,
  profileProgress,
  onHintFieldChange,
  onResetHints,
}: LocationBriefSectionProps) {
  const t = useTranslations('analytics.branches.form')
  const tm = useTranslations('analytics.branches.form.manualBrief')

  return (
    <TabsContent value="marketing" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {t('profileCompleteness', {
              filled: profileFilledCount,
              total: BRIEF_PROFILE_FIELD_COUNT,
            })}
          </p>
          <span className="text-sm font-medium tabular-nums">{profileProgress}%</span>
        </div>
        <Progress value={profileProgress} aria-label={t('tabs.marketing')} />
      </div>

      <Field>
        <FieldLabel htmlFor="brief-notes">{tm('notesLabel')}</FieldLabel>
        <FieldDescription>{tm('sections.profile.description')}</FieldDescription>
        <Textarea
          id="brief-notes"
          rows={4}
          disabled={loading}
          placeholder={tm('notesPlaceholder')}
          value={hints.notes}
          onChange={(e) => onHintFieldChange('notes', e.target.value)}
        />
      </Field>

      <FieldSet className="rounded-lg border border-border/80 bg-muted/10 p-4">
        <FieldLegend>{tm('sections.profile.title')}</FieldLegend>
        <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="instagram-handle">{tm('instagramHandleLabel')}</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText>@</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="instagram-handle"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={BRIEF_TEXT_MAX_LENGTHS.instagramHandle + 1}
                disabled={loading}
                placeholder={tm('instagramHandlePlaceholder')}
                value={hints.instagramHandle}
                onChange={(e) => onHintFieldChange('instagramHandle', e.target.value)}
              />
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="neighborhood">{tm('neighborhoodLabel')}</FieldLabel>
            <Input
              id="neighborhood"
              autoComplete="off"
              maxLength={BRIEF_TEXT_MAX_LENGTHS.neighborhood}
              disabled={loading}
              placeholder={tm('neighborhoodPlaceholder')}
              value={hints.neighborhood}
              onChange={(e) => onHintFieldChange('neighborhood', e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="phone">{tm('phoneLabel')}</FieldLabel>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={BRIEF_TEXT_MAX_LENGTHS.phone}
              disabled={loading}
              placeholder={tm('phonePlaceholder')}
              value={hints.phone}
              onChange={(e) => onHintFieldChange('phone', e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="contact-email">{tm('contactEmailLabel')}</FieldLabel>
            <Input
              id="contact-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              maxLength={BRIEF_TEXT_MAX_LENGTHS.contactEmail}
              disabled={loading}
              placeholder={tm('contactEmailPlaceholder')}
              value={hints.contactEmail}
              onChange={(e) => onHintFieldChange('contactEmail', e.target.value)}
            />
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="website-url">{tm('websiteUrlLabel')}</FieldLabel>
            <Input
              id="website-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              maxLength={BRIEF_TEXT_MAX_LENGTHS.websiteUrl}
              disabled={loading}
              placeholder={tm('websiteUrlPlaceholder')}
              value={hints.websiteUrl}
              onChange={(e) => onHintFieldChange('websiteUrl', e.target.value)}
            />
          </Field>
        </FieldGroup>

        <Collapsible defaultOpen className="mt-4 flex flex-col gap-3">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex w-full touch-manipulation justify-between px-0"
            >
              <span>{t('collapsible.bookAndOrder')}</span>
              <ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-4">
            <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="reservation-url">{tm('reservationUrlLabel')}</FieldLabel>
                <Input
                  id="reservation-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  maxLength={BRIEF_TEXT_MAX_LENGTHS.reservationUrl}
                  disabled={loading}
                  placeholder={tm('reservationUrlPlaceholder')}
                  value={hints.reservationUrl}
                  onChange={(e) => onHintFieldChange('reservationUrl', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="online-order-url">{tm('onlineOrderUrlLabel')}</FieldLabel>
                <Input
                  id="online-order-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  maxLength={BRIEF_TEXT_MAX_LENGTHS.onlineOrderUrl}
                  disabled={loading}
                  placeholder={tm('onlineOrderUrlPlaceholder')}
                  value={hints.onlineOrderUrl}
                  onChange={(e) => onHintFieldChange('onlineOrderUrl', e.target.value)}
                />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="menu-url">{tm('menuUrlLabel')}</FieldLabel>
                <Input
                  id="menu-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  maxLength={BRIEF_TEXT_MAX_LENGTHS.menuUrl}
                  disabled={loading}
                  placeholder={tm('menuUrlPlaceholder')}
                  value={hints.menuUrl}
                  onChange={(e) => onHintFieldChange('menuUrl', e.target.value)}
                />
              </Field>
            </FieldGroup>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible className="flex flex-col gap-3">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex w-full touch-manipulation justify-between px-0"
            >
              <span>{t('collapsible.maps')}</span>
              <ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Field>
              <FieldLabel htmlFor="google-maps-url">{tm('googleMapsUrlLabel')}</FieldLabel>
              <Input
                id="google-maps-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                maxLength={BRIEF_TEXT_MAX_LENGTHS.googleMapsUrl}
                disabled={loading}
                placeholder={tm('googleMapsUrlPlaceholder')}
                value={hints.googleMapsUrl}
                onChange={(e) => onHintFieldChange('googleMapsUrl', e.target.value)}
              />
            </Field>
          </CollapsibleContent>
        </Collapsible>
      </FieldSet>

      {briefHintsHasAnySelection(hints) ? (
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onResetHints}>
          {tm('resetHints')}
        </Button>
      ) : null}
    </TabsContent>
  )
}
