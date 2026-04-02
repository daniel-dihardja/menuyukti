"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import filterData from "./shop-filter-data.json";

const defaultCollectionId = filterData.collections[0]?.id ?? "all";
const defaultSortId = filterData.sortOptions[0]?.id ?? "newest";

export function ShopFilterBar() {
  const [activeCollectionId, setActiveCollectionId] =
    useState(defaultCollectionId);
  const [sortId, setSortId] = useState(defaultSortId);

  return (
    <section className="mb-16">
      <Card>
        <CardContent className="flex flex-col items-stretch justify-between gap-8 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            {filterData.collections.map((c) => (
              <Button
                key={c.id}
                type="button"
                variant={
                  activeCollectionId === c.id ? "default" : "outline"
                }
                onClick={() => setActiveCollectionId(c.id)}
              >
                {c.label}
              </Button>
            ))}
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 md:w-auto">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {filterData.labels.sortBy}
              </span>
              <Select value={sortId} onValueChange={setSortId}>
                <SelectTrigger aria-label="Sort products" className="w-full md:w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {filterData.sortOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
