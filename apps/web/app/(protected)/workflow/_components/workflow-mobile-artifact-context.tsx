'use client'

import { createContext, use, type ReactNode } from 'react'

export type WorkflowMobileArtifactContextValue = {
  openArtifact: () => void
  hint: string | null
}

const WorkflowMobileArtifactContext = createContext<WorkflowMobileArtifactContextValue | null>(null)

export function WorkflowMobileArtifactProvider({
  children,
  openArtifact,
  hint,
}: {
  children: ReactNode
  openArtifact: () => void
  hint?: string | null
}) {
  return (
    <WorkflowMobileArtifactContext value={{ openArtifact, hint: hint ?? null }}>
      {children}
    </WorkflowMobileArtifactContext>
  )
}

/** Present only on mobile when the artifact sheet is available. */
export function useWorkflowMobileArtifact(): WorkflowMobileArtifactContextValue | null {
  return use(WorkflowMobileArtifactContext)
}
