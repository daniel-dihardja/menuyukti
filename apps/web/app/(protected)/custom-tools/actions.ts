'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { graphqlQuery } from '@/lib/graphql/client'
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

const urlSchema = z.string().trim().min(1).max(2048)

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(1).max(256),
  description: z.string().trim().min(1).max(8000),
  url: urlSchema,
  isActive: z.boolean(),
})

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(256),
  description: z.string().trim().min(1).max(8000),
  url: urlSchema,
  isActive: z.boolean(),
})

export type CreateUpdateToolResult =
  | { ok: true; tool: ApiAdapterToolRow }
  | { ok: false; error: string }

export type DeleteToolResult = { ok: true } | { ok: false; error: string }

export async function createApiAdapterToolAction(raw: unknown): Promise<CreateUpdateToolResult> {
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { ok: false, error: msg }
  }
  try {
    const { userId } = await auth()
    if (!userId) {
      return { ok: false, error: 'Unauthorized' }
    }
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
    const { userId } = await auth()
    if (!userId) {
      return { ok: false, error: 'Unauthorized' }
    }
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
    const { userId } = await auth()
    if (!userId) {
      return { ok: false, error: 'Unauthorized' }
    }
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
