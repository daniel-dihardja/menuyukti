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

  period_start: string; // ISO date string
  period_end: string; // ISO date string

  popularity_index: JsonValue;
  menu_heatmaps: JsonValue;
};

export type AnalyticMenuItem = {
  menu: string;
};

export type AnalyticsResponse = {
  analytics: AnalyticsSummary;
  menu_items: AnalyticMenuItem[];
};
