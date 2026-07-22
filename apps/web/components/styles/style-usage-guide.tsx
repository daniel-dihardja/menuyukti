'use client'

import { ChevronDownIcon, CopyIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { cn } from '@workspace/ui/lib/utils'

import { parseStyleSpec } from '@/lib/styles/style-spec'
import { buildStyleUsageGuide, type StyleUsageProperty } from '@/lib/styles/style-usage'

type StyleUsageGuideProps = {
  spec: unknown
  className?: string
}

function fallbackDescription(
  type: StyleUsageProperty['type'],
  t: (key: 'fallbackEnum' | 'fallbackBoolean' | 'fallbackNumber' | 'fallbackText') => string,
): string {
  switch (type) {
    case 'enum':
      return t('fallbackEnum')
    case 'boolean':
      return t('fallbackBoolean')
    case 'number':
      return t('fallbackNumber')
    case 'text':
      return t('fallbackText')
  }
}

export function StyleUsageGuide({ spec, className }: StyleUsageGuideProps) {
  const t = useTranslations('postCreator.prompt.style.usage')
  const [open, setOpen] = useState(false)

  const parsed = parseStyleSpec(spec)
  if (!parsed) return null

  const guide = buildStyleUsageGuide(parsed)
  if (guide.properties.length === 0) return null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(guide.exampleBrief)
      toast.success(t('copied'))
    } catch {
      toast.error(t('copyFailed'))
    }
  }

  return (
    <Collapsible className={cn('w-full', className)} onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger asChild>
        <Button
          className="text-muted-foreground hover:text-foreground h-auto w-full justify-between px-0 py-1 text-xs font-normal"
          size="sm"
          type="button"
          variant="ghost"
        >
          <span>{t('title')}</span>
          <ChevronDownIcon
            aria-hidden
            className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-180')}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-1">
        <p className="text-muted-foreground text-xs">{t('intro')}</p>
        <ul className="space-y-2.5">
          {guide.properties.map((property) => (
            <li className="space-y-0.5" key={property.key}>
              <p className="text-foreground text-xs font-medium">
                {property.label}{' '}
                <span className="text-muted-foreground font-normal">({property.key})</span>
              </p>
              <p className="text-muted-foreground text-xs">
                {property.description ?? fallbackDescription(property.type, t)}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('valuesLabel')}: {property.summary}
              </p>
              <code className="bg-muted text-foreground block overflow-x-auto rounded px-1.5 py-1 font-mono text-[11px] leading-snug whitespace-pre-wrap">
                {property.exampleTag}
              </code>
            </li>
          ))}
        </ul>
        <Button
          className="h-7 gap-1.5 text-xs"
          onClick={() => void handleCopy()}
          size="sm"
          type="button"
          variant="outline"
        >
          <CopyIcon aria-hidden className="size-3.5" />
          {t('copyExample')}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  )
}
