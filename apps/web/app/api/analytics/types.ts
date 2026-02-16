import type { JsonValue } from "@/lib/json";

export type PipelineMetadata = {
  schema_version: string;
  source_system: string;
  pipeline_run_id: string;
  ingested_at_utc: string;
  quality_status: string;
};

export type AnalyticsSummary = {
  total_orders: number;
  total_items_sold: number;
  total_revenue: number;

  avg_order_revenue: number;
  max_order_revenue: number;
  min_order_revenue: number;

  avg_order_items: number;
  max_order_items: number;
  min_order_items: number;

  avg_popularity: number;

  period_start: string;
  period_end: string;

  popularity_index: JsonValue | null;
  menu_heatmaps: JsonValue | null;
};

export type AnalyticMenuItem = {
  menu: string;
  quantity: number;
  total_revenue: number;
  menu_category: string | null;
  menu_category_detail: string | null;
};

export type AnalyticsResponse = {
  metadata?: PipelineMetadata;
  analytics: AnalyticsSummary;
  menu_items: AnalyticMenuItem[];
  staging?: {
    raw_rows?: JsonValue[];
    rejected_rows?: Array<{
      row_data: JsonValue;
      rejection_reason: string;
    }>;
  };
};

export type AnalyticsListItem = {
  id: number;
  name: string; // sourceFile
  uploadedAt: string; // ISO date
};
