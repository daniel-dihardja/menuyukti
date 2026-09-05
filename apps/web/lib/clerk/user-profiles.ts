import { clerkClient } from '@clerk/nextjs/server'

export type ClerkUserProfile = {
  clerkUserId: string
  name: string | null
  imageUrl: string | null
}

type ClerkUserLike = {
  id: string
  fullName: string | null
  firstName: string | null
  lastName: string | null
  username: string | null
  imageUrl: string
  primaryEmailAddress?: { emailAddress: string } | null
  emailAddresses: Array<{ emailAddress: string }>
}

export function displayNameFromClerkUser(user: {
  fullName: string | null
  firstName: string | null
  lastName: string | null
  username: string | null
  primaryEmailAddress?: { emailAddress: string } | null
  emailAddresses: Array<{ emailAddress: string }>
}): string | null {
  const full = user.fullName?.trim()
  if (full) return full
  const combined = `${user.firstName?.trim() ?? ''} ${user.lastName?.trim() ?? ''}`.trim()
  if (combined) return combined
  if (user.username) return user.username
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress
  if (email) {
    const local = email.split('@')[0]
    if (local) return local
  }
  return null
}

export function primaryEmailFromClerkUser(user: {
  primaryEmailAddress?: { emailAddress: string } | null
  emailAddresses: Array<{ emailAddress: string }>
}): string | null {
  return user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
}

/**
 * Batch-resolve Clerk profiles for unique user ids.
 * Missing / deleted users are omitted from the map.
 */
export async function getClerkUserProfilesByIds(
  clerkUserIds: readonly (string | null | undefined)[],
): Promise<Map<string, ClerkUserProfile>> {
  const uniqueIds = [...new Set(clerkUserIds.filter((id): id is string => Boolean(id?.trim())))]
  const profiles = new Map<string, ClerkUserProfile>()
  if (uniqueIds.length === 0) return profiles

  const client = await clerkClient()
  try {
    const result = await client.users.getUserList({
      userId: uniqueIds,
      limit: uniqueIds.length,
    })
    for (const user of result.data as ClerkUserLike[]) {
      profiles.set(user.id, {
        clerkUserId: user.id,
        name: displayNameFromClerkUser(user),
        imageUrl: user.imageUrl || null,
      })
    }
  } catch {
    // Fall back to per-id lookups so a single failure does not blank the batch.
    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const user = (await client.users.getUser(id)) as ClerkUserLike
          profiles.set(id, {
            clerkUserId: id,
            name: displayNameFromClerkUser(user),
            imageUrl: user.imageUrl || null,
          })
        } catch {
          // omit missing users
        }
      }),
    )
  }

  return profiles
}

export function actorFromProfileMap(
  clerkUserId: string | null | undefined,
  profiles: Map<string, ClerkUserProfile>,
): ClerkUserProfile | null {
  if (!clerkUserId) return null
  return profiles.get(clerkUserId) ?? { clerkUserId, name: null, imageUrl: null }
}
