export type SeedTable = {
  schema: string;
  table: string;
};

// Dependency-safe order for inserts (parents first).
export const SEED_TABLES: SeedTable[] = [
  { schema: "public", table: "branches" },
  { schema: "public", table: "analytics" },
  { schema: "public", table: "etl_jobs" },
  { schema: "public", table: "analytics_menu_items" },
  { schema: "public", table: "agent_outputs" },
  { schema: "public", table: "fixed_costs" },
  { schema: "public", table: "menu_alias" },
  { schema: "public", table: "anomaly_events" },
  { schema: "public", table: "instagram_campaigns" },
  { schema: "public", table: "instagram_posts" },
  { schema: "public", table: "instagram_post_promoted_items" },
  { schema: "public", table: "instagram_weekly_schedules" },
  { schema: "public", table: "instagram_weekly_schedule_entries" },
  { schema: "public", table: "instagram_schedule_post_drafts" },
  { schema: "public", table: "instagram_schedule_post_draft_history" },
];
