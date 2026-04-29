import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { GraphQLRequestError } from '@/lib/graphql/client'

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'GRAPHQL_BAD_USER_INPUT'
  | 'GRAPHQL_FORBIDDEN'
  | 'INTERNAL_ERROR'

export type ApiErrorPayload = {
  code: ApiErrorCode
  message: string
  details?: unknown
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorPayload> {
  return NextResponse.json({ code, message, details }, { status })
}

export function apiErrorFromUnknown(
  error: unknown,
  fallbackMessage: string,
): NextResponse<ApiErrorPayload> {
  if (error instanceof ZodError) {
    return apiError('BAD_REQUEST', 'Invalid input', 400, error.issues)
  }
  if (error instanceof GraphQLRequestError) {
    if (error.codes.includes('FORBIDDEN')) {
      return apiError('GRAPHQL_FORBIDDEN', error.message || 'Forbidden', 403)
    }
    if (error.codes.includes('BAD_USER_INPUT')) {
      return apiError('GRAPHQL_BAD_USER_INPUT', error.message || 'Invalid request', 400)
    }
    return apiError('INTERNAL_ERROR', error.message || fallbackMessage, 500)
  }
  const message = error instanceof Error ? error.message : fallbackMessage
  return apiError('INTERNAL_ERROR', message, 500)
}
