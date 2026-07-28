import { apiFetch } from '@/lib/api/client-fetch'
import type { CrmApp } from '@/lib/graphql/queries/crm-apps'
import type {
  CrmCashbackEntry,
  CrmCustomer,
  CrmDevice,
  CrmEnrollmentToken,
} from '@/lib/graphql/queries/crm-registrations'

export type { CrmApp, CrmCashbackEntry, CrmCustomer, CrmDevice, CrmEnrollmentToken }

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

export async function getCrmApp(id: number): Promise<CrmApp> {
  const result = await apiFetch<{ app: CrmApp }>(
    `/api/crm/apps/${encodeURIComponent(String(id))}`,
    { cache: 'no-store' },
    'Failed to load app',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.app
}

export async function updateCrmApp(
  id: number,
  input: {
    title: string
    cashbackThresholdAmount: number
    cashbackPercent: number
  },
): Promise<CrmApp> {
  const result = await apiFetch<{ app: CrmApp }>(
    `/api/crm/apps/${encodeURIComponent(String(id))}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to update app',
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

export async function listCrmCustomers(appId: number, search?: string): Promise<CrmCustomer[]> {
  const params = new URLSearchParams({ appId: String(appId) })
  if (search?.trim()) params.set('search', search.trim())
  const result = await apiFetch<{ customers?: CrmCustomer[] }>(
    `/api/crm/registrations?${params.toString()}`,
    { cache: 'no-store' },
    'Failed to load registrations',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.customers ?? []
}

export async function getCrmCustomer(id: string): Promise<CrmCustomer | null> {
  const result = await apiFetch<{ customer: CrmCustomer | null }>(
    `/api/crm/registrations/${encodeURIComponent(id)}`,
    { cache: 'no-store' },
    'Failed to load registration',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.customer
}

export async function createCrmEnrollmentToken(appId: number): Promise<CrmEnrollmentToken> {
  const result = await apiFetch<{ enrollment: CrmEnrollmentToken }>(
    '/api/crm/registrations/enrollment-token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId }),
    },
    'Failed to create enrollment token',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.enrollment
}

export async function deleteCrmCustomer(id: string): Promise<void> {
  const result = await apiFetch<{ ok: boolean }>(
    `/api/crm/registrations/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    'Failed to delete registration',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
}

export async function revokeCrmDevice(deviceId: string): Promise<CrmDevice> {
  const result = await apiFetch<{ device: CrmDevice }>(
    `/api/crm/registrations/devices/${encodeURIComponent(deviceId)}/revoke`,
    { method: 'POST' },
    'Failed to revoke device',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.device
}

export async function awardCrmCashback(
  customerId: string,
  input: { amount: number; label?: string },
): Promise<CrmCashbackEntry> {
  const result = await apiFetch<{ entry: CrmCashbackEntry }>(
    `/api/crm/registrations/${encodeURIComponent(customerId)}/cashback`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Failed to award cashback',
  )
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data.entry
}
