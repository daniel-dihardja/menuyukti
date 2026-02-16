"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import {
  DEFAULT_MATRIX_FILTER_STATE,
  type MatrixFilterState,
  serializeMatrixFilterState,
} from "@/lib/analytics/matrix-filter-state";
import {
  getMatrixFilterPresets,
  type MatrixPresetKey,
} from "@/lib/analytics/matrix-filter-presets";
import type { MatrixAction, MatrixCategory } from "@/lib/analytics/matrix-row-contract";

type Props = {
  filters: MatrixFilterState;
};

const CATEGORY_OPTIONS: Array<{ value: MatrixCategory; label: string }> = [
  { value: "star", label: "Star" },
  { value: "plow_horse", label: "Plow Horse" },
  { value: "puzzle", label: "Puzzle" },
  { value: "low_end", label: "Low End" },
];

const ACTION_OPTIONS: Array<{ value: MatrixAction; label: string }> = [
  { value: "keep", label: "Keep" },
  { value: "promote", label: "Promote" },
  { value: "reprice", label: "Improve" },
  { value: "remove", label: "Remove" },
];

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function MatrixFilterBar({ filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(filters.q);
  const [categories, setCategories] = useState<MatrixCategory[]>(filters.categories);
  const [actions, setActions] = useState<MatrixAction[]>(filters.actions);
  const [marginMin, setMarginMin] = useState(
    filters.marginMin === null ? "" : String(filters.marginMin),
  );
  const [marginMax, setMarginMax] = useState(
    filters.marginMax === null ? "" : String(filters.marginMax),
  );
  const [qtyMin, setQtyMin] = useState(
    filters.qtyMin === null ? "" : String(filters.qtyMin),
  );
  const [qtyMax, setQtyMax] = useState(
    filters.qtyMax === null ? "" : String(filters.qtyMax),
  );
  const [sort, setSort] = useState(filters.sort);
  const [order, setOrder] = useState(filters.order);
  const [activePreset, setActivePreset] = useState<MatrixPresetKey | null>(null);

  const presetDefinitions = useMemo(() => getMatrixFilterPresets(), []);

  const hasActiveFilters = useMemo(
    () =>
      q.trim().length > 0 ||
      categories.length > 0 ||
      actions.length > 0 ||
      marginMin.trim().length > 0 ||
      marginMax.trim().length > 0 ||
      qtyMin.trim().length > 0 ||
      qtyMax.trim().length > 0 ||
      sort !== DEFAULT_MATRIX_FILTER_STATE.sort ||
      order !== DEFAULT_MATRIX_FILTER_STATE.order,
    [actions, categories, marginMax, marginMin, order, q, qtyMax, qtyMin, sort],
  );

  const toggleCategory = (category: MatrixCategory) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category],
    );
  };

  const toggleAction = (action: MatrixAction) => {
    setActions((prev) =>
      prev.includes(action) ? prev.filter((item) => item !== action) : [...prev, action],
    );
  };

  const applyFilters = () => {
    const searchParams = serializeMatrixFilterState({
      q: q.trim(),
      categories,
      actions,
      marginMin: parseNumber(marginMin),
      marginMax: parseNumber(marginMax),
      qtyMin: parseNumber(qtyMin),
      qtyMax: parseNumber(qtyMax),
      sort,
      order,
    });

    const query = searchParams.toString();
    setActivePreset(null);
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const applyPreset = (preset: MatrixPresetKey) => {
    const definition = presetDefinitions.find((item) => item.key === preset);
    if (!definition) return;

    setQ(definition.state.q);
    setCategories(definition.state.categories);
    setActions(definition.state.actions);
    setMarginMin(
      definition.state.marginMin === null ? "" : String(definition.state.marginMin),
    );
    setMarginMax(
      definition.state.marginMax === null ? "" : String(definition.state.marginMax),
    );
    setQtyMin(definition.state.qtyMin === null ? "" : String(definition.state.qtyMin));
    setQtyMax(definition.state.qtyMax === null ? "" : String(definition.state.qtyMax));
    setSort(definition.state.sort);
    setOrder(definition.state.order);
    setActivePreset(preset);

    const searchParams = serializeMatrixFilterState(definition.state);
    const query = searchParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const resetFilters = () => {
    setQ("");
    setCategories([]);
    setActions([]);
    setMarginMin("");
    setMarginMax("");
    setQtyMin("");
    setQtyMax("");
    setSort(DEFAULT_MATRIX_FILTER_STATE.sort);
    setOrder(DEFAULT_MATRIX_FILTER_STATE.order);
    setActivePreset(null);
    router.push(pathname);
  };

  return (
    <section className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Matrix Filter Bar
          </h3>
          <p className="text-sm text-muted-foreground">
            Focus on the menu items that matter most for marketing actions.
          </p>
        </div>
        {hasActiveFilters && (
          <Badge variant="secondary" className="text-xs">
            Active filters
          </Badge>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="matrix-filter-search">Search menu item</Label>
          <Input
            id="matrix-filter-search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="e.g. burger, coffee, pasta"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="matrix-filter-margin-min">Margin % min (0-1)</Label>
          <Input
            id="matrix-filter-margin-min"
            inputMode="decimal"
            value={marginMin}
            onChange={(event) => setMarginMin(event.target.value)}
            placeholder="0.30"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="matrix-filter-margin-max">Margin % max (0-1)</Label>
          <Input
            id="matrix-filter-margin-max"
            inputMode="decimal"
            value={marginMax}
            onChange={(event) => setMarginMax(event.target.value)}
            placeholder="0.75"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="matrix-filter-qty-min">Units sold min</Label>
          <Input
            id="matrix-filter-qty-min"
            inputMode="numeric"
            value={qtyMin}
            onChange={(event) => setQtyMin(event.target.value)}
            placeholder="10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="matrix-filter-qty-max">Units sold max</Label>
          <Input
            id="matrix-filter-qty-max"
            inputMode="numeric"
            value={qtyMax}
            onChange={(event) => setQtyMax(event.target.value)}
            placeholder="500"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="matrix-filter-sort">Sort by</Label>
          <select
            id="matrix-filter-sort"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={sort}
            onChange={(event) => setSort(event.target.value as MatrixFilterState["sort"])}
          >
            <option value="unitsSold">Units Sold</option>
            <option value="revenue">Revenue</option>
            <option value="contributionMargin">Margin</option>
            <option value="marginPct">Margin %</option>
            <option value="menuItem">Menu Item</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="matrix-filter-order">Order</Label>
          <select
            id="matrix-filter-order"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={order}
            onChange={(event) => setOrder(event.target.value as MatrixFilterState["order"])}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Smart Presets
        </p>
        <div className="flex flex-wrap gap-2">
          {presetDefinitions.map((preset) => {
            const isActive = activePreset === preset.key;
            return (
              <Button
                key={preset.key}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                title={preset.description}
                onClick={() => applyPreset(preset.key)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Categories
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((option) => {
            const active = categories.includes(option.value);
            return (
              <Button
                key={option.value}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCategory(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recommendation Actions
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTION_OPTIONS.map((option) => {
            const active = actions.includes(option.value);
            return (
              <Button
                key={option.value}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => toggleAction(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={resetFilters}>
          Reset
        </Button>
        <Button type="button" onClick={applyFilters}>
          Apply Filters
        </Button>
      </div>
    </section>
  );
}
