# Story 17: Add Idempotency Key for File Ingestion

## Goal
Avoid duplicate analytics runs when users upload the same report repeatedly.

## Scope
- Define idempotency key from file hash + location + period.
- Enforce uniqueness at pipeline run level.
- Return existing run/job when duplicate upload is detected.

## Acceptance Criteria
- Re-uploading identical file does not create duplicate facts.
- API response indicates duplicate and references prior run.
- Duplicate prevention is guaranteed by DB constraint.

## Deliverables
- Idempotency key generation logic.
- Unique index/constraint migration.

## Status
`complete`
