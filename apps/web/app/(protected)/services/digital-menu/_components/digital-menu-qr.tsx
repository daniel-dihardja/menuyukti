'use client'

import { useCallback, useRef, useSyncExternalStore } from 'react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'

import { Button } from '@workspace/ui/components/button'

const PREVIEW_SIZE = 180
const DOWNLOAD_SIZE = 1024

type Props = {
  absoluteUrl: string
  locationName: string
  downloadFileName: string
  showSlugChangedHint: boolean
  title: string
  cta: string
  downloadPngLabel: string
  printLabel: string
  ariaLabel: string
  slugChangedHint: string
  printTitle: string
}

function subscribeNoop() {
  return () => {}
}

function getClientOrigin(): string {
  return window.location.origin
}

function getServerOrigin(): string {
  return ''
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function DigitalMenuQr({
  absoluteUrl,
  locationName,
  downloadFileName,
  showSlugChangedHint,
  title,
  cta,
  downloadPngLabel,
  printLabel,
  ariaLabel,
  slugChangedHint,
  printTitle,
}: Props) {
  const canvasWrapRef = useRef<HTMLDivElement>(null)

  const getCanvasDataUrl = useCallback((): string | null => {
    const canvas = canvasWrapRef.current?.querySelector('canvas')
    if (!canvas) return null
    return canvas.toDataURL('image/png')
  }, [])

  const handleDownloadPng = useCallback(() => {
    const href = getCanvasDataUrl()
    if (!href) return
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = downloadFileName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }, [downloadFileName, getCanvasDataUrl])

  const handlePrint = useCallback(() => {
    const dataUrl = getCanvasDataUrl()
    if (!dataUrl) return
    const heading = escapeHtml(printTitle || locationName)
    const ctaText = escapeHtml(cta)
    const urlText = escapeHtml(absoluteUrl)
    const win = window.open('', '_blank', 'noopener,noreferrer,width=480,height=720')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${heading}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2rem;
      font-family: system-ui, sans-serif;
      color: #000;
      background: #fff;
    }
    h1 { margin: 0; font-size: 1.5rem; text-align: center; }
    .cta { margin: 0; font-size: 1rem; text-align: center; }
    img { width: 280px; height: 280px; }
    .url {
      margin: 0;
      max-width: 24rem;
      font-family: ui-monospace, monospace;
      font-size: 0.875rem;
      text-align: center;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <h1>${heading}</h1>
  <p class="cta">${ctaText}</p>
  <img src="${dataUrl}" width="280" height="280" alt="" />
  <p class="url">${urlText}</p>
  <script>
    window.addEventListener('load', function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`)
    win.document.close()
  }, [absoluteUrl, cta, getCanvasDataUrl, locationName, printTitle])

  return (
    <div className="border-border flex flex-col gap-3 border-t pt-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="rounded-lg bg-white p-3 ring-1 ring-black/5">
          <QRCodeSVG value={absoluteUrl} size={PREVIEW_SIZE} level="M" title={ariaLabel} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm font-medium">{cta}</p>
          <p className="text-muted-foreground break-all font-mono text-xs">{absoluteUrl}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleDownloadPng}>
              {downloadPngLabel}
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrint}>
              {printLabel}
            </Button>
          </div>
          {showSlugChangedHint ? (
            <p className="text-muted-foreground text-xs">{slugChangedHint}</p>
          ) : null}
        </div>
      </div>

      <div
        ref={canvasWrapRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
      >
        <QRCodeCanvas value={absoluteUrl} size={DOWNLOAD_SIZE} level="M" marginSize={4} />
      </div>
    </div>
  )
}

/** Build absolute public menu URL on the client after mount. */
export function useClientAbsoluteUrl(path: string | null): string | null {
  const origin = useSyncExternalStore(subscribeNoop, getClientOrigin, getServerOrigin)
  if (!path || !origin) return null
  return `${origin}${path}`
}
