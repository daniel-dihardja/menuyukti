import { apiFetch } from '@/lib/api/client-fetch'
import type { Playbook } from '@/lib/graphql/queries/playbooks'

export type { Playbook }

export async function listPlaybooks(playbookType: string): Promise<Playbook[]> {
  const params = new URLSearchParams({ playbookType })
  const result = await apiFetch<{ playbooks: Playbook[] }>(
    `/api/playbooks?${params.toString()}`,
    { method: 'GET' },
    'Failed to list playbooks',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.playbooks
}

export async function createPlaybook(input: {
  locationId: number
  name: string
  playbookType: string
  startDate: string
  endDate: string
}): Promise<Playbook> {
  const result = await apiFetch<{ playbook: Playbook }>(
    '/api/playbooks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to create playbook',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.playbook
}

export async function updatePlaybook(
  id: number,
  input: {
    locationId: number
    name: string
    startDate: string
    endDate: string
  },
): Promise<Playbook> {
  const result = await apiFetch<{ playbook: Playbook }>(
    `/api/playbooks/${encodeURIComponent(String(id))}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to update playbook',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.playbook
}

export async function deletePlaybook(id: number): Promise<void> {
  const result = await apiFetch<{ ok: boolean }>(
    `/api/playbooks/${encodeURIComponent(String(id))}`,
    { method: 'DELETE' },
    'Failed to delete playbook',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
}
