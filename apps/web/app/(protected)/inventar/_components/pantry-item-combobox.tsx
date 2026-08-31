'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import type { InventoryCatalogItem } from '@/lib/graphql/queries/inventory-catalog'
import { Button } from '@workspace/ui/components/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@workspace/ui/components/command'
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover'
import { cn } from '@workspace/ui/lib/utils'

import { formatPackLabel } from './format-pack'

export type PantryItemComboboxProps = {
  items: InventoryCatalogItem[]
  value: string
  onValueChange: (id: string) => void
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  disabled?: boolean
}

function itemLabel(item: InventoryCatalogItem): string {
  return `${item.name} (${formatPackLabel(item.packageSize, item.packageUnit)})`
}

function itemSearchValue(item: InventoryCatalogItem): string {
  return `${item.name} ${formatPackLabel(item.packageSize, item.packageUnit)}`
}

export function PantryItemCombobox({
  items,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled = false,
}: PantryItemComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = items.find((item) => String(item.id) === value)

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="min-h-11 w-full justify-between touch-manipulation font-normal lg:min-h-9"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? itemLabel(selected) : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const id = String(item.id)
                return (
                  <CommandItem
                    key={item.id}
                    value={itemSearchValue(item)}
                    onSelect={() => {
                      onValueChange(id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn('size-4 shrink-0', value === id ? 'opacity-100' : 'opacity-0')}
                      aria-hidden
                    />
                    <span className="truncate">{itemLabel(item)}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
