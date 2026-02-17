"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  DEFAULT_HEATMAP_FILTER_STATE,
  type HeatmapFilterState,
  serializeHeatmapFilterState,
} from "@/lib/analytics/heatmap-filter-state";

type Props = {
  filters: HeatmapFilterState;
  sortWindows: string[];
};

export function HeatmapFilterBar({ filters, sortWindows }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(filters.q);
  const [top, setTop] = useState(String(filters.top));
  const [segment, setSegment] = useState(filters.segment);
  const [sort, setSort] = useState(filters.sort);
  const [sortWindow, setSortWindow] = useState(filters.sortWindow);
  const [order, setOrder] = useState(filters.order);

  const apply = () => {
    const next: HeatmapFilterState = {
      q: q.trim(),
      top: Math.max(1, Math.min(200, Math.round(Number(top) || DEFAULT_HEATMAP_FILTER_STATE.top))),
      segment,
      sort,
      sortWindow: sort === "window" ? sortWindow : "",
      order,
    };

    const query = serializeHeatmapFilterState(next).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const reset = () => {
    setQ(DEFAULT_HEATMAP_FILTER_STATE.q);
    setTop(String(DEFAULT_HEATMAP_FILTER_STATE.top));
    setSegment(DEFAULT_HEATMAP_FILTER_STATE.segment);
    setSort(DEFAULT_HEATMAP_FILTER_STATE.sort);
    setSortWindow(DEFAULT_HEATMAP_FILTER_STATE.sortWindow);
    setOrder(DEFAULT_HEATMAP_FILTER_STATE.order);
    router.push(pathname);
  };

  return (
    <section className="border bg-card/95 p-4 space-y-4 shadow-sm ring-1 ring-border/40">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Heatmap Filters
        </h3>
        <p className="text-sm text-muted-foreground">
          Focus on the most relevant menu rows and timing segments.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="heatmap-filter-search">Menu search</Label>
            <Input
              id="heatmap-filter-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="e.g. latte, burger"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="heatmap-filter-top">Top rows</Label>
            <Input
              id="heatmap-filter-top"
              inputMode="numeric"
              value={top}
              onChange={(event) => setTop(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="heatmap-filter-segment">Weekly segment</Label>
            <Select value={segment} onValueChange={(value) => setSegment(value as HeatmapFilterState["segment"])}>
              <SelectTrigger id="heatmap-filter-segment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="weekday">Weekdays</SelectItem>
                <SelectItem value="weekend">Weekends</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="heatmap-filter-sort">Sort by</Label>
            <Select value={sort} onValueChange={(value) => setSort(value as HeatmapFilterState["sort"])}>
              <SelectTrigger id="heatmap-filter-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total Demand</SelectItem>
                <SelectItem value="window">Selected Window</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="heatmap-filter-window">Sort window</Label>
            <Select value={sortWindow || sortWindows[0] || ""} onValueChange={setSortWindow}>
              <SelectTrigger id="heatmap-filter-window">
                <SelectValue placeholder="Select time window" />
              </SelectTrigger>
              <SelectContent>
                {sortWindows.map((window) => (
                  <SelectItem key={window} value={window}>
                    {window}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="heatmap-filter-order">Order</Label>
            <Select value={order} onValueChange={(value) => setOrder(value as HeatmapFilterState["order"])}>
              <SelectTrigger id="heatmap-filter-order">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit">Apply Filters</Button>
          <Button type="button" variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </form>
    </section>
  );
}
