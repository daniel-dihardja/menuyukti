'use client'

import { InventarCopilotPanel } from './inventar-copilot-panel'

type Props = {
  active: boolean
  onClose: () => void
  locationId: number | null
  className?: string
  showCloseButton?: boolean
}

/** Inventar refill assistant on CopilotKit/AG-UI (ChatKit dual-run removed). */
export function InventarAssistantActivePanel(props: Props) {
  return <InventarCopilotPanel {...props} />
}
