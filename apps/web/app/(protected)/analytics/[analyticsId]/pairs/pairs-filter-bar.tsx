"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import {
  DEFAULT_PAIR_FILTER_STATE,
  type PairFilterState,
  serializePairFilterState,
} from "@/lib/analytics/pair-filter-state";

type Props = {
  filters: PairFilterState;
};

function parseNumber(value: string, fallback: number): number {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function PairsFilterBar({ filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(filters.q);
  const [minSampleSize, setMinSampleSize] = useState(String(filters.minSampleSize));
  const [minLift, setMinLift] = useState(String(filters.minLift));
  const [minConfidence, setMinConfidence] = useState(String(filters.minConfidence));
  const [limit, setLimit] = useState(String(filters.limit));
  const [sort, setSort] = useState(filters.sort);
  const [order, setOrder] = useState(filters.order);

  const applyFilters = () => {
    const nextState: PairFilterState = {
      q: q.trim(),
      minSampleSize: Math.max(1, Math.round(parseNumber(minSampleSize, DEFAULT_PAIR_FILTER_STATE.minSampleSize))),
      minLift: Math.max(0, parseNumber(minLift, DEFAULT_PAIR_FILTER_STATE.minLift)),
      minConfidence: Math.max(0, Math.min(1, parseNumber(minConfidence, DEFAULT_PAIR_FILTER_STATE.minConfidence))),
      limit: Math.max(10, Math.round(parseNumber(limit, DEFAULT_PAIR_FILTER_STATE.limit))),
      sort,
      order,
    };

    const searchParams = serializePairFilterState(nextState);
    const query = searchParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const resetFilters = () => {
    setQ("");
    setMinSampleSize(String(DEFAULT_PAIR_FILTER_STATE.minSampleSize));
    setMinLift(String(DEFAULT_PAIR_FILTER_STATE.minLift));
    setMinConfidence(String(DEFAULT_PAIR_FILTER_STATE.minConfidence));
    setLimit(String(DEFAULT_PAIR_FILTER_STATE.limit));
    setSort(DEFAULT_PAIR_FILTER_STATE.sort);
    setOrder(DEFAULT_PAIR_FILTER_STATE.order);
    router.push(pathname);
  };

  return (
    <section className="border bg-card/95 p-4 space-y-4 shadow-sm ring-1 ring-border/40">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pair Insight Filters
        </h3>
        <p className="text-sm text-muted-foreground">
          Focus the analysis on meaningful pair strength and confidence.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="pair-filter-search">Search pair menu items</Label>
            <Input
              id="pair-filter-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="e.g. burger, iced tea"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pair-filter-min-sample" className="flex items-center gap-1.5">
              Min sample size
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Min sample size help"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6} className="max-w-xs">
                  Minimum number of shared orders required before a pair is shown.
                  Increase this to reduce noisy low-volume pairs.
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="pair-filter-min-sample"
              inputMode="numeric"
              value={minSampleSize}
              onChange={(event) => setMinSampleSize(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pair-filter-min-lift" className="flex items-center gap-1.5">
              Min lift
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Min lift help"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6} className="max-w-xs">
                  Lift above 1 means the pair appears together more often than random chance.
                  Start at 1.0, then increase for stricter association quality.
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="pair-filter-min-lift"
              inputMode="decimal"
              value={minLift}
              onChange={(event) => setMinLift(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pair-filter-min-confidence">Min confidence (0-1)</Label>
            <Input
              id="pair-filter-min-confidence"
              inputMode="decimal"
              value={minConfidence}
              onChange={(event) => setMinConfidence(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pair-filter-limit">Rows limit</Label>
            <Input
              id="pair-filter-limit"
              inputMode="numeric"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pair-filter-sort">Sort by</Label>
            <Select
              value={sort}
              onValueChange={(value) => setSort(value as PairFilterState["sort"])}
            >
              <SelectTrigger id="pair-filter-sort" className="w-full rounded-none shadow-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comboScore">Combo Score</SelectItem>
                <SelectItem value="lift">Lift</SelectItem>
                <SelectItem value="pairOrders">Pair Orders</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="confidence">Confidence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pair-filter-order">Order</Label>
            <Select
              value={order}
              onValueChange={(value) => setOrder(value as PairFilterState["order"])}
            >
              <SelectTrigger id="pair-filter-order" className="w-full rounded-none shadow-sm">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">Apply Filters</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>
    </section>
  );
}
