'use client'

import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  BRIEF_PROFILE_FIELD_COUNT,
  BRIEF_TEXT_MAX_LENGTHS,
  briefHintsHasAnySelection,
  nextSuggestedBriefField,
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

import { useLocationFormActions, useLocationFormState } from './location-form-context'

export function LocationBriefSection() {
  const t = useTranslations('analytics.branches.form')
  const tm = useTranslations('analytics.branches.form.manualBrief')
  const { loading, hints, profileFilledCount, profileProgress } = useLocationFormState()
  const { setHintField, resetHints } = useLocationFormActions()
  const nextField = nextSuggestedBriefField(hints)

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
        {nextField ? (
          <p className="text-sm text-muted-foreground">
            {t('profileNextSuggested', { field: t(`profileNextFields.${nextField}`) })}
          </p>
        ) : null}
      </div>

      <FieldSet className="rounded-lg border border-border/80 bg-muted/10 p-4">
        <FieldLegend>{tm('sections.profile.title')}</FieldLegend>
        <FieldDescription>{tm('sections.profile.description')}</FieldDescription>
        <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
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
              onChange={(e) => setHintField('phone', e.target.value)}
              className="h-11 text-base md:h-9"
            />
          </Field>

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
                onChange={(e) => setHintField('instagramHandle', e.target.value)}
                className="h-11 text-base md:h-9"
              />
            </InputGroup>
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
              onChange={(e) => setHintField('websiteUrl', e.target.value)}
              className="h-11 text-base md:h-9"
            />
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
              onChange={(e) => setHintField('neighborhood', e.target.value)}
              className="h-11 text-base md:h-9"
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
              onChange={(e) => setHintField('contactEmail', e.target.value)}
              className="h-11 text-base md:h-9"
            />
          </Field>
        </FieldGroup>

        <Field className="mt-4">
          <FieldLabel htmlFor="brief-notes">{tm('notesLabel')}</FieldLabel>
          <Textarea
            id="brief-notes"
            rows={3}
            disabled={loading}
            placeholder={tm('notesPlaceholder')}
            value={hints.notes}
            onChange={(e) => setHintField('notes', e.target.value)}
            className="text-base md:text-sm"
          />
        </Field>

        <Collapsible className="mt-4 flex flex-col gap-3">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex h-11 w-full touch-manipulation justify-between px-0"
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
                  onChange={(e) => setHintField('reservationUrl', e.target.value)}
                  className="h-11 text-base md:h-9"
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
                  onChange={(e) => setHintField('onlineOrderUrl', e.target.value)}
                  className="h-11 text-base md:h-9"
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
                  onChange={(e) => setHintField('menuUrl', e.target.value)}
                  className="h-11 text-base md:h-9"
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
              className="flex h-11 w-full touch-manipulation justify-between px-0"
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
                onChange={(e) => setHintField('googleMapsUrl', e.target.value)}
                className="h-11 text-base md:h-9"
              />
            </Field>
          </CollapsibleContent>
        </Collapsible>
      </FieldSet>

      {briefHintsHasAnySelection(hints) ? (
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={resetHints}>
          {tm('resetHints')}
        </Button>
      ) : null}
    </TabsContent>
  )
}
