import { apiFetch } from '@/lib/api/client-fetch'
import type { CrmApp } from '@/lib/graphql/queries/crm-apps'

export type { CrmApp }

export async function listCrmApps(): Promise<CrmApp[]> {
  const result = await apiFetch<{ apps?: CrmApp[] }>(
    '/api/crm/apps',
    { cache: 'no-store' },
    'Failed to load apps',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.apps ?? []
}

export async function createCrmApp(input: { title: string }): Promise<CrmApp> {
  const result = await apiFetch<{ app: CrmApp }>(
    '/api/crm/apps',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to create app',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.app
}

export async function deleteCrmApp(id: number): Promise<void> {
  const result = await apiFetch<{ ok: boolean }>(
    `/api/crm/apps/${encodeURIComponent(String(id))}`,
    { method: 'DELETE' },
    'Failed to delete app',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
}
