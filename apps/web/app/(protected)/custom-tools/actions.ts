'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
import { isMenuyuktiAdmin } from '@/lib/menuyukti-role'
import { resolveMenuyuktiRole } from '@/lib/menuyukti-role-server'
import { routes } from '@/lib/routes'
import {
  CREATE_API_ADAPTER_TOOL_MUTATION,
  DELETE_API_ADAPTER_TOOL_MUTATION,
  type ApiAdapterToolRow,
  type CreateApiAdapterToolData,
  type DeleteApiAdapterToolData,
  UPDATE_API_ADAPTER_TOOL_MUTATION,
  type UpdateApiAdapterToolData,
} from '@/lib/graphql/queries'

function hostnameForIpCheck(hostname: string): string {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1)
  }
  return hostname
}

function isBlockedAdapterHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '')
  if (h === 'localhost' || h === 'metadata' || h === 'metadata.google.internal') return true
  if (h.endsWith('.localhost') || h.endsWith('.local')) return true
  return false
}

/** Reject obvious private / loopback / link-local IPv4 literals (defense in depth; GraphQL is authoritative). */
function isDisallowedPublicInternetLiteral(host: string): boolean {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const m = host.match(ipv4)
  if (m) {
    const parts = [m[1], m[2], m[3], m[4]].map((x) => Number(x))
    if (parts.some((n) => n > 255)) return true
    const [a, b] = parts as [number, number, number, number]
    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 127) return true
    if (a === 169 && b === 254) return true
    if (parts.every((n) => n === 0)) return true
    return false
  }
  if (host.includes(':')) {
    const lower = host.toLowerCase()
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fe80:')) return true
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  }
  return false
}

const httpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .superRefine((val, ctx) => {
    try {
      const u = new URL(val)
      if (u.protocol !== 'https:') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'URL must use https' })
        return
      }
      if (!u.hostname) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'URL must include a valid host' })
        return
      }
      if (u.username !== '' || u.password !== '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'URL must not contain a username or password',
        })
        return
      }
      if (isBlockedAdapterHostname(u.hostname)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'This hostname is not allowed for API adapter URLs',
        })
        return
      }
      const ipHost = hostnameForIpCheck(u.hostname)
      if (isDisallowedPublicInternetLiteral(ipHost)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'URL must not use a private, loopback, or link-local address',
        })
      }
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid URL' })
    }
  })

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1).max(256),
  description: z.string().trim().min(1).max(8000),
  url: httpsUrlSchema,
  isActive: z.boolean(),
})

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(256),
  description: z.string().trim().min(1).max(8000),
  url: httpsUrlSchema,
  isActive: z.boolean(),
})

export type CreateUpdateToolResult =
  | { ok: true; tool: ApiAdapterToolRow }
  | { ok: false; error: string }

export type DeleteToolResult = { ok: true } | { ok: false; error: string }

type ActionAuthOk = { ok: true; userId: string }
type ActionAuthFail = { ok: false; error: string }

async function requireMenuyuktiAdminForAction(): Promise<ActionAuthOk | ActionAuthFail> {
  const { userId } = await auth()
  if (!userId) {
    return { ok: false, error: 'Unauthorized' }
  }
  const role = await resolveMenuyuktiRole()
  if (!isMenuyuktiAdmin(role)) {
    return { ok: false, error: 'Forbidden' }
  }
  return { ok: true, userId }
}

export async function createApiAdapterToolAction(raw: unknown): Promise<CreateUpdateToolResult> {
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { ok: false, error: msg }
  }
  try {
    const authz = await requireMenuyuktiAdminForAction()
    if (!authz.ok) {
      return { ok: false, error: authz.error }
    }
    const { userId } = authz
    const data = await graphqlQuery<CreateApiAdapterToolData>(
      CREATE_API_ADAPTER_TOOL_MUTATION,
      {
        workspaceId: parsed.data.workspaceId,
        name: parsed.data.name,
        description: parsed.data.description,
        url: parsed.data.url,
        isActive: parsed.data.isActive,
      },
      userId,
      'CreateApiAdapterTool',
    )
    revalidatePath(routes.customTools)
    return { ok: true, tool: data.createApiAdapterTool }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return { ok: false, error: msg }
  }
}

export async function updateApiAdapterToolAction(raw: unknown): Promise<CreateUpdateToolResult> {
  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { ok: false, error: msg }
  }
  try {
    const authz = await requireMenuyuktiAdminForAction()
    if (!authz.ok) {
      return { ok: false, error: authz.error }
    }
    const { userId } = authz
    const data = await graphqlQuery<UpdateApiAdapterToolData>(
      UPDATE_API_ADAPTER_TOOL_MUTATION,
      {
        id: parsed.data.id,
        name: parsed.data.name,
        description: parsed.data.description,
        url: parsed.data.url,
        isActive: parsed.data.isActive,
      },
      userId,
      'UpdateApiAdapterTool',
    )
    revalidatePath(routes.customTools)
    return { ok: true, tool: data.updateApiAdapterTool }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return { ok: false, error: msg }
  }
}

export async function deleteApiAdapterToolAction(id: string): Promise<DeleteToolResult> {
  const idClean = id.trim()
  if (!idClean) {
    return { ok: false, error: 'Missing id' }
  }
  try {
    const authz = await requireMenuyuktiAdminForAction()
    if (!authz.ok) {
      return { ok: false, error: authz.error }
    }
    const { userId } = authz
    await graphqlQuery<DeleteApiAdapterToolData>(
      DELETE_API_ADAPTER_TOOL_MUTATION,
      { id: idClean },
      userId,
      'DeleteApiAdapterTool',
    )
    revalidatePath(routes.customTools)
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return { ok: false, error: msg }
  }
}
