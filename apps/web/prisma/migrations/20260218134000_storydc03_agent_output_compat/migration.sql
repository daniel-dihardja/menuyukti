-- Story DC-03: Add compatibility fields for agent output envelope and run metadata.
ALTER TABLE "public"."agent_outputs"
  ADD COLUMN IF NOT EXISTS "contract_version" TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS "run_id" TEXT,
  ADD COLUMN IF NOT EXISTS "model_name" TEXT,
  ADD COLUMN IF NOT EXISTS "run_status" TEXT,
  ADD COLUMN IF NOT EXISTS "input_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "output_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "token_usage_json" JSONB,
  ADD COLUMN IF NOT EXISTS "output_envelope_json" JSONB;

CREATE INDEX IF NOT EXISTS "ix_agent_output_run_id"
  ON "public"."agent_outputs" ("run_id");

-- Backfill baseline envelope for existing rows where missing.
UPDATE "public"."agent_outputs"
SET
  "contract_version" = COALESCE(NULLIF("contract_version", ''), 'v1'),
  "output_envelope_json" = COALESCE(
    "output_envelope_json",
    jsonb_build_object(
      'contractVersion', 'v1',
      'run', jsonb_build_object(
        'status', COALESCE("run_status", CASE WHEN "outputs" IS NULL THEN 'failed' ELSE 'succeeded' END)
      ),
      'outputs', "outputs"
    )
  )
WHERE "output_envelope_json" IS NULL
   OR "contract_version" IS NULL
   OR "contract_version" = '';
