import type { JsonValue } from "@/lib/json";

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
  analytics: AnalyticsSummary;
  menu_items: AnalyticMenuItem[];
};

export type AnalyticsListItem = {
  id: number;
  name: string; // sourceFile
  uploadedAt: string; // ISO date
};
