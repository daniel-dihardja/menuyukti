'use client'

import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'

import { cn } from '@workspace/ui/lib/utils'

type LandingSampleMenuQrProps = {
  /** Absolute URL encoded in the QR (and used for the text alternative). */
  value: string
  /** Relative path for in-app navigation of the text link. */
  href: string
  ariaLabel: string
  linkLabel: string
  className?: string
  /** QR pixel size; default suits desktop hero. */
  size?: number
}

export function LandingSampleMenuQr({
  value,
  href,
  ariaLabel,
  linkLabel,
  className,
  size = 220,
}: LandingSampleMenuQrProps) {
  return (
    <figure className={cn('flex flex-col items-center gap-3', className)}>
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <QRCodeSVG value={value} size={size} level="M" title={ariaLabel} />
      </div>
      <Link
        href={href}
        className="max-w-[16rem] break-all text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        {linkLabel}
      </Link>
    </figure>
  )
}
