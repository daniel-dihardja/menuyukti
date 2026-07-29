import type { MobileEnrollBody } from '@/app/api/mobile/crm/v1/enroll/schema'

import { postCrmUpstream, type CrmUpstreamResult } from './crm-upstream'

/**
 * Forward enroll to private GraphQL POST /crm/v1/enroll (no internal API key).
 */
export async function postCrmEnrollUpstream(body: MobileEnrollBody): Promise<CrmUpstreamResult> {
  return postCrmUpstream({
    path: '/crm/v1/enroll',
    body: {
      token: body.token,
      appId: body.appId,
      publicKey: body.publicKey,
      platform: body.platform,
      ...(body.phoneE164 ? { phoneE164: body.phoneE164 } : {}),
    },
    unreachableMessage: 'Could not reach enrollment service',
    logLabel: 'mobile/crm/enroll',
  })
}
