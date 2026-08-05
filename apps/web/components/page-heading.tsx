import { cn } from '@workspace/ui/lib/utils'

type PageHeadingProps = {
  title: string
  description?: string
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}

export function PageHeading({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
}: PageHeadingProps) {
  return (
    <header className={cn('flex flex-col gap-1', className)}>
      <h1 className={cn('text-pretty text-2xl font-semibold tracking-tight', titleClassName)}>
        {title}
      </h1>
      {description ? (
        <p className={cn('text-pretty text-sm text-muted-foreground', descriptionClassName)}>
          {description}
        </p>
      ) : null}
    </header>
  )
}
