'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Label } from '@workspace/ui/components/label'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import { Separator } from '@workspace/ui/components/separator'
import { Slider } from '@workspace/ui/components/slider'
import { TableCell, TableRow } from '@workspace/ui/components/table'
import { SortableTable, type SortableTableColumn } from '@/components/sortable-table'

export const COGS_WE_STEP = 0.01
export const COGS_UNCATEGORIZED_KEY = '__uncategorized__'

export type CogsMenuItem = {
  id: number
  menuName: string
  cogs: number | null
  quantity: number
  totalRevenue: number
  price: number
  menuCategory: string | null
}

export type CogsColKey = 'menuName' | 'rowNumber' | 'cogsWe'

type CogsFieldBindings = {
  loading: boolean
  currencyCode: string
  cogsValues: Record<number, string>
  weValues: Record<number, number>
  activeInputId: number | null
  formatDisplayValue: (raw: string) => string
  onCogsInputChange: (item: CogsMenuItem, raw: string) => void
  onCogsFocus: (itemId: number) => void
  onCogsBlur: (itemId: number) => void
  onWeSliderChange: (item: CogsMenuItem, next: number) => void
}

type CogsAmountInputProps = {
  item: CogsMenuItem
  loading: boolean
  currencyCode: string
  cogsRaw: string
  displayFormatted: string
  isEditing: boolean
  onCogsInputChange: (raw: string) => void
  onCogsFocus: () => void
  onCogsBlur: () => void
}

function CogsAmountInput({
  item,
  loading,
  currencyCode,
  cogsRaw,
  displayFormatted,
  isEditing,
  onCogsInputChange,
  onCogsFocus,
  onCogsBlur,
}: CogsAmountInputProps) {
  return (
    <InputGroup className="min-w-0">
      <InputGroupAddon>
        <InputGroupText>{currencyCode}</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={`cogs-${item.id}`}
        name={`cogs-${item.id}`}
        type="text"
        inputMode="decimal"
        value={isEditing ? cogsRaw : displayFormatted}
        onChange={(event) => onCogsInputChange(event.target.value)}
        onFocus={onCogsFocus}
        onBlur={onCogsBlur}
        placeholder="0.00"
        disabled={loading}
        className="text-right tabular-nums"
      />
    </InputGroup>
  )
}

function WeRatioSlider({
  item,
  loading,
  weValue,
  onWeSliderChange,
  weAriaLabel,
}: {
  item: CogsMenuItem
  loading: boolean
  weValue: number
  onWeSliderChange: (next: number) => void
  weAriaLabel: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Slider
        id={`we-${item.id}`}
        value={[weValue]}
        min={0}
        max={1}
        step={COGS_WE_STEP}
        disabled={loading || item.price <= 0}
        onValueChange={(vals) => {
          const next = vals[0]
          if (next === undefined) return
          onWeSliderChange(next)
        }}
        aria-label={weAriaLabel}
        className="min-w-0 flex-1"
      />
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {Math.round(weValue * 100)}%
      </span>
    </div>
  )
}

function MenuItemCogsFields({
  item,
  bindings,
}: {
  item: CogsMenuItem
  bindings: CogsFieldBindings
}) {
  const t = useTranslations('analytics.cogsForm')

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <CogsAmountInput
        item={item}
        loading={bindings.loading}
        currencyCode={bindings.currencyCode}
        cogsRaw={bindings.cogsValues[item.id] ?? ''}
        displayFormatted={bindings.formatDisplayValue(bindings.cogsValues[item.id] ?? '')}
        isEditing={bindings.activeInputId === item.id}
        onCogsInputChange={(raw) => bindings.onCogsInputChange(item, raw)}
        onCogsFocus={() => bindings.onCogsFocus(item.id)}
        onCogsBlur={() => bindings.onCogsBlur(item.id)}
      />
      <WeRatioSlider
        item={item}
        loading={bindings.loading}
        weValue={bindings.weValues[item.id] ?? 0}
        onWeSliderChange={(next) => bindings.onWeSliderChange(item, next)}
        weAriaLabel={t('table.weAria', { menu: item.menuName })}
      />
    </div>
  )
}

export function CogsMobileSortToolbar({
  sortKey,
  sortDirection,
  onToggleSort,
}: {
  sortKey: CogsColKey
  sortDirection: 'asc' | 'desc'
  onToggleSort: (key: CogsColKey) => void
}) {
  const t = useTranslations('analytics.cogsForm')
  const mobileSortLabel =
    sortKey === 'menuName' && sortDirection === 'asc'
      ? t('table.sortNameAsc')
      : t('table.sortNameDesc')
  const mobileSortAria =
    sortKey === 'menuName' && sortDirection === 'asc'
      ? t('table.sortNameButtonAriaAsc')
      : t('table.sortNameButtonAriaDesc')

  return (
    <div className="flex flex-col gap-1 border-b pb-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 w-fit shrink-0 px-2"
        onClick={() => onToggleSort('menuName')}
        aria-label={mobileSortAria}
      >
        {mobileSortLabel}
      </Button>
      <p className="text-xs text-muted-foreground">{t('table.sortNameHint')}</p>
    </div>
  )
}

export function CogsCategoryBulkBlock({
  sectionKey,
  sectionLabel,
  itemsForApply,
  loading,
  categoryWeEnabled,
  categoryWeValues,
  onCategoryWeEnabledChange,
  onCategoryWeValueChange,
  onApplyCategoryWe,
}: {
  sectionKey: string
  sectionLabel: string
  itemsForApply: CogsMenuItem[]
  loading: boolean
  categoryWeEnabled: Record<string, boolean>
  categoryWeValues: Record<string, number>
  onCategoryWeEnabledChange: (sectionKey: string, enabled: boolean) => void
  onCategoryWeValueChange: (sectionKey: string, value: number) => void
  onApplyCategoryWe: (items: CogsMenuItem[], nextWe: number) => void
}) {
  const t = useTranslations('analytics.cogsForm')

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`category-we-enable-${sectionKey}`}
          checked={categoryWeEnabled[sectionKey] ?? false}
          onCheckedChange={(checked) => {
            onCategoryWeEnabledChange(sectionKey, checked === true)
          }}
          disabled={loading}
        />
        <Label htmlFor={`category-we-enable-${sectionKey}`}>{t('table.categoryWe.enable')}</Label>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Slider
          id={`category-we-${sectionKey}`}
          value={[categoryWeValues[sectionKey] ?? 0]}
          min={0}
          max={1}
          step={COGS_WE_STEP}
          disabled={loading || !(categoryWeEnabled[sectionKey] ?? false)}
          onValueChange={(vals) => {
            const next = vals[0]
            if (next === undefined) return
            onCategoryWeValueChange(sectionKey, next)
            onApplyCategoryWe(itemsForApply, next)
          }}
          aria-label={t('table.categoryWe.aria', { category: sectionLabel })}
          className="min-w-0 flex-1"
        />
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {Math.round((categoryWeValues[sectionKey] ?? 0) * 100)}%
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{t('table.categoryWe.hint')}</p>
    </div>
  )
}

export function CogsTableRow({
  item,
  rowNumber,
  bindings,
}: {
  item: CogsMenuItem
  rowNumber: number
  bindings: CogsFieldBindings
}) {
  return (
    <TableRow
      key={item.id}
      className="transition-colors focus-within:bg-muted focus-within:ring-1 focus-within:ring-primary/40"
    >
      <TableCell className="px-3 py-2 text-sm text-muted-foreground tabular-nums">
        {rowNumber}.
      </TableCell>
      <TableCell className="px-3 py-2">
        <Label htmlFor={`cogs-${item.id}`} className="truncate">
          {item.menuName}
        </Label>
      </TableCell>
      <TableCell className="px-3 py-2">
        <MenuItemCogsFields item={item} bindings={bindings} />
      </TableCell>
    </TableRow>
  )
}

export function CogsMobileItemBlock({
  item,
  indexInSection,
  bindings,
}: {
  item: CogsMenuItem
  indexInSection: number
  bindings: CogsFieldBindings
}) {
  const t = useTranslations('analytics.cogsForm')

  return (
    <div className="min-w-0 py-3 first:pt-0">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <p className="text-xs tabular-nums text-muted-foreground">#{indexInSection}</p>
          <p className="text-sm font-medium leading-snug break-words">{item.menuName}</p>
        </div>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor={`cogs-${item.id}`}>{t('table.cogs')}</FieldLabel>
            <CogsAmountInput
              item={item}
              loading={bindings.loading}
              currencyCode={bindings.currencyCode}
              cogsRaw={bindings.cogsValues[item.id] ?? ''}
              displayFormatted={bindings.formatDisplayValue(bindings.cogsValues[item.id] ?? '')}
              isEditing={bindings.activeInputId === item.id}
              onCogsInputChange={(raw) => bindings.onCogsInputChange(item, raw)}
              onCogsFocus={() => bindings.onCogsFocus(item.id)}
              onCogsBlur={() => bindings.onCogsBlur(item.id)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`we-${item.id}`}>{t('table.we')}</FieldLabel>
            <WeRatioSlider
              item={item}
              loading={bindings.loading}
              weValue={bindings.weValues[item.id] ?? 0}
              onWeSliderChange={(next) => bindings.onWeSliderChange(item, next)}
              weAriaLabel={t('table.weAria', { menu: item.menuName })}
            />
          </Field>
        </FieldGroup>
      </div>
    </div>
  )
}

export function CogsCategorySection({
  title,
  sectionKey,
  items,
  tableColumns,
  sortKey,
  sortDirection,
  onToggleSort,
  bindings,
  categoryWeEnabled,
  categoryWeValues,
  onCategoryWeEnabledChange,
  onCategoryWeValueChange,
  onApplyCategoryWe,
  rowNumberOffset = 0,
}: {
  title: string
  sectionKey: string
  items: CogsMenuItem[]
  tableColumns: SortableTableColumn<CogsColKey>[]
  sortKey: CogsColKey
  sortDirection: 'asc' | 'desc'
  onToggleSort: (key: CogsColKey) => void
  bindings: CogsFieldBindings
  categoryWeEnabled: Record<string, boolean>
  categoryWeValues: Record<string, number>
  onCategoryWeEnabledChange: (sectionKey: string, enabled: boolean) => void
  onCategoryWeValueChange: (sectionKey: string, value: number) => void
  onApplyCategoryWe: (items: CogsMenuItem[], nextWe: number) => void
  rowNumberOffset?: number
}) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex min-w-0 flex-col gap-3">
        <CardTitle className="break-words">{title}</CardTitle>
        <div className="lg:hidden">
          <CogsMobileSortToolbar
            sortDirection={sortDirection}
            sortKey={sortKey}
            onToggleSort={onToggleSort}
          />
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <CogsCategoryBulkBlock
          categoryWeEnabled={categoryWeEnabled}
          categoryWeValues={categoryWeValues}
          itemsForApply={items}
          loading={bindings.loading}
          onApplyCategoryWe={onApplyCategoryWe}
          onCategoryWeEnabledChange={onCategoryWeEnabledChange}
          onCategoryWeValueChange={onCategoryWeValueChange}
          sectionKey={sectionKey}
          sectionLabel={title}
        />
        <div className="lg:hidden">
          <div className="flex flex-col">
            {items.map((item, idx) => (
              <div key={item.id}>
                {idx > 0 ? <Separator className="my-0" /> : null}
                <CogsMobileItemBlock bindings={bindings} indexInSection={idx + 1} item={item} />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block">
          <SortableTable<CogsColKey>
            columns={tableColumns}
            sortDirection={sortDirection}
            sortKey={sortKey}
            onSort={onToggleSort}
          >
            {items.map((item, idx) => (
              <CogsTableRow
                key={item.id}
                bindings={bindings}
                item={item}
                rowNumber={rowNumberOffset + idx + 1}
              />
            ))}
          </SortableTable>
        </div>
      </CardContent>
    </Card>
  )
}

export type { CogsFieldBindings }
