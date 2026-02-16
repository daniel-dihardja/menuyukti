"use client";

import { useMemo, useState } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  SortableTableHead,
  useSortableColumns,
} from "@/components/sortable-table";
import { pairTypeLabel, type PairType } from "@/lib/analytics/pair-type";

type PairInsightRow = {
  kind: "pair";
  pairKey: string;
  menuA: string;
  menuB: string;
  pairOrders: number;
  support: number;
  confidenceAtoB: number;
  confidenceBtoA: number;
  liftAtoB: number;
  liftBtoA: number;
  score: number;
  isNoisy: boolean;
  pairType: PairType;
};

type ComboInsightRow = {
  kind: "combo";
  pairKey: string;
  menuA: string;
  menuB: string;
  pairOrders: number;
  support: number;
  confidenceAtoB: number;
  confidenceBtoA: number;
  liftAtoB: number;
  liftBtoA: number;
  score: number;
  marginScore: number;
  confidenceLevel: string;
  pairType: PairType;
  pairTypeBoostFactor: number;
  pairTypeBoostApplied: boolean;
  baseScore: number;
};

type InsightRow = PairInsightRow | ComboInsightRow;

type Props = {
  pairs: PairInsightRow[];
  combos: ComboInsightRow[];
};

type PairSortKey = "pair" | "orders" | "support" | "confidence" | "lift" | "score";
type ComboSortKey =
  | "combo"
  | "orders"
  | "lift"
  | "marginScore"
  | "opportunityScore"
  | "confidence";

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function num(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function pairTypeBadgeClass(pairType: PairType): string {
  if (pairType === "food_drink") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (pairType === "food_food") return "bg-amber-100 text-amber-800 border-amber-300";
  if (pairType === "drink_drink") return "bg-sky-100 text-sky-800 border-sky-300";
  return "bg-muted text-muted-foreground border-border";
}

function explainability(row: InsightRow): string[] {
  const lines = [
    `Pair volume: ${row.pairOrders} shared orders.`,
    `Support: ${pct(row.support)} of total baskets.`,
    `Confidence A→B: ${pct(row.confidenceAtoB)}, B→A: ${pct(row.confidenceBtoA)}.`,
    `Lift A→B: ${num(row.liftAtoB)}, B→A: ${num(row.liftBtoA)}.`,
  ];

  if (row.kind === "pair") {
    lines.push(`Composite strength score: ${num(row.score)}.`);
    lines.push(`Pair type: ${pairTypeLabel(row.pairType)}.`);
    if (row.isNoisy) {
      lines.push("This pair is marked as noisy due to low sample size.");
    }
  } else {
    lines.push(`Pair type: ${pairTypeLabel(row.pairType)}.`);
    lines.push(`Combo opportunity score: ${num(row.score)}.`);
    lines.push(`Base score (before pair-type boost): ${num(row.baseScore)}.`);
    if (row.pairTypeBoostApplied) {
      lines.push(
        `Pair-type boost applied (${num((row.pairTypeBoostFactor - 1) * 100)}% uplift).`,
      );
    } else {
      lines.push("No pair-type boost applied.");
    }
    lines.push(`Margin contribution score: ${num(row.marginScore)}.`);
    lines.push(`Confidence level: ${row.confidenceLevel}.`);
  }

  return lines;
}

export function PairsInsightPanels({ pairs, combos }: Props) {
  const [selected, setSelected] = useState<InsightRow | null>(null);
  const {
    sortKey: pairSortKey,
    sortDirection: pairSortOrder,
    toggleSort: togglePairSort,
  } = useSortableColumns<PairSortKey>("score");
  const {
    sortKey: comboSortKey,
    sortDirection: comboSortOrder,
    toggleSort: toggleComboSort,
  } = useSortableColumns<ComboSortKey>("opportunityScore");

  const topPairs = useMemo(() => {
    const sorted = [...pairs].sort((a, b) => {
      const confidenceA = (a.confidenceAtoB + a.confidenceBtoA) / 2;
      const confidenceB = (b.confidenceAtoB + b.confidenceBtoA) / 2;
      const liftA = (a.liftAtoB + a.liftBtoA) / 2;
      const liftB = (b.liftAtoB + b.liftBtoA) / 2;

      const valueA =
        pairSortKey === "pair"
          ? `${a.menuA} + ${a.menuB}`
          : pairSortKey === "orders"
            ? a.pairOrders
            : pairSortKey === "support"
              ? a.support
              : pairSortKey === "confidence"
                ? confidenceA
                : pairSortKey === "lift"
                  ? liftA
                  : a.score;
      const valueB =
        pairSortKey === "pair"
          ? `${b.menuA} + ${b.menuB}`
          : pairSortKey === "orders"
            ? b.pairOrders
            : pairSortKey === "support"
              ? b.support
              : pairSortKey === "confidence"
                ? confidenceB
                : pairSortKey === "lift"
                  ? liftB
                  : b.score;

      if (typeof valueA === "string" && typeof valueB === "string") {
        const diff = valueA.localeCompare(valueB);
        return pairSortOrder === "asc" ? diff : -diff;
      }

      const diff = Number(valueA) - Number(valueB);
      if (diff !== 0) return pairSortOrder === "asc" ? diff : -diff;
      return a.pairKey.localeCompare(b.pairKey);
    });

    return sorted;
  }, [pairSortKey, pairSortOrder, pairs]);

  const topCombos = useMemo(() => {
    const sorted = [...combos].sort((a, b) => {
      const confidenceA = (a.confidenceAtoB + a.confidenceBtoA) / 2;
      const confidenceB = (b.confidenceAtoB + b.confidenceBtoA) / 2;
      const liftA = (a.liftAtoB + a.liftBtoA) / 2;
      const liftB = (b.liftAtoB + b.liftBtoA) / 2;

      const valueA =
        comboSortKey === "combo"
          ? `${a.menuA} + ${a.menuB}`
          : comboSortKey === "orders"
            ? a.pairOrders
            : comboSortKey === "lift"
              ? liftA
              : comboSortKey === "marginScore"
                ? a.marginScore
                : comboSortKey === "opportunityScore"
                  ? a.score
                  : confidenceA;
      const valueB =
        comboSortKey === "combo"
          ? `${b.menuA} + ${b.menuB}`
          : comboSortKey === "orders"
            ? b.pairOrders
            : comboSortKey === "lift"
              ? liftB
              : comboSortKey === "marginScore"
                ? b.marginScore
                : comboSortKey === "opportunityScore"
                  ? b.score
                  : confidenceB;

      if (typeof valueA === "string" && typeof valueB === "string") {
        const diff = valueA.localeCompare(valueB);
        return comboSortOrder === "asc" ? diff : -diff;
      }

      const diff = Number(valueA) - Number(valueB);
      if (diff !== 0) return comboSortOrder === "asc" ? diff : -diff;
      return a.pairKey.localeCompare(b.pairKey);
    });

    return sorted;
  }, [comboSortKey, comboSortOrder, combos]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Top Pair Menu Items</h2>
        <p className="text-sm text-muted-foreground">
          Ranked by selected filter logic. Click a row for explainability.
        </p>

        <div className="border border-border/70 bg-card p-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortableTableHead
                  align="left"
                  active={pairSortKey === "pair"}
                  direction={pairSortOrder}
                  onToggle={() => togglePairSort("pair")}
                >
                  Pair
                </SortableTableHead>
                <SortableTableHead
                  active={pairSortKey === "orders"}
                  direction={pairSortOrder}
                  onToggle={() => togglePairSort("orders")}
                >
                  Orders
                </SortableTableHead>
                <SortableTableHead
                  active={pairSortKey === "support"}
                  direction={pairSortOrder}
                  onToggle={() => togglePairSort("support")}
                >
                  Support
                </SortableTableHead>
                <SortableTableHead
                  active={pairSortKey === "confidence"}
                  direction={pairSortOrder}
                  onToggle={() => togglePairSort("confidence")}
                >
                  Confidence
                </SortableTableHead>
                <SortableTableHead
                  active={pairSortKey === "lift"}
                  direction={pairSortOrder}
                  onToggle={() => togglePairSort("lift")}
                >
                  Lift
                </SortableTableHead>
                <SortableTableHead
                  active={pairSortKey === "score"}
                  direction={pairSortOrder}
                  onToggle={() => togglePairSort("score")}
                >
                  Score
                </SortableTableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pair Type
                </TableHead>
                <TableHead className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quality
                </TableHead>
                <TableHead className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPairs.map((row) => (
                <TableRow key={row.pairKey}>
                  <TableCell className="font-medium">{row.menuA} + {row.menuB}</TableCell>
                  <TableCell className="text-right">{num(row.pairOrders)}</TableCell>
                  <TableCell className="text-right">{pct(row.support)}</TableCell>
                  <TableCell className="text-right">{pct((row.confidenceAtoB + row.confidenceBtoA) / 2)}</TableCell>
                  <TableCell className="text-right">{num((row.liftAtoB + row.liftBtoA) / 2)}</TableCell>
                  <TableCell className="text-right">{num(row.score)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={pairTypeBadgeClass(row.pairType)}>
                      {pairTypeLabel(row.pairType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.isNoisy ? (
                      <Badge variant="secondary">Noisy</Badge>
                    ) : (
                      <Badge variant="default">Stable</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelected(row)}>
                      Explain
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Top Combo Opportunities</h2>
        <p className="text-sm text-muted-foreground">
          Margin-aware ranking for campaign-ready bundles.
        </p>

        <div className="border border-border/70 bg-card p-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortableTableHead
                  align="left"
                  active={comboSortKey === "combo"}
                  direction={comboSortOrder}
                  onToggle={() => toggleComboSort("combo")}
                >
                  Combo Candidate
                </SortableTableHead>
                <SortableTableHead
                  active={comboSortKey === "orders"}
                  direction={comboSortOrder}
                  onToggle={() => toggleComboSort("orders")}
                >
                  Orders
                </SortableTableHead>
                <SortableTableHead
                  active={comboSortKey === "lift"}
                  direction={comboSortOrder}
                  onToggle={() => toggleComboSort("lift")}
                >
                  Lift
                </SortableTableHead>
                <SortableTableHead
                  active={comboSortKey === "marginScore"}
                  direction={comboSortOrder}
                  onToggle={() => toggleComboSort("marginScore")}
                >
                  Margin Score
                </SortableTableHead>
                <SortableTableHead
                  active={comboSortKey === "opportunityScore"}
                  direction={comboSortOrder}
                  onToggle={() => toggleComboSort("opportunityScore")}
                >
                  Opportunity Score
                </SortableTableHead>
                <SortableTableHead
                  active={comboSortKey === "confidence"}
                  direction={comboSortOrder}
                  onToggle={() => toggleComboSort("confidence")}
                >
                  Confidence
                </SortableTableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pair Type
                </TableHead>
                <TableHead className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCombos.map((row) => (
                <TableRow key={row.pairKey}>
                  <TableCell className="font-medium">{row.menuA} + {row.menuB}</TableCell>
                  <TableCell className="text-right">{num(row.pairOrders)}</TableCell>
                  <TableCell className="text-right">{num((row.liftAtoB + row.liftBtoA) / 2)}</TableCell>
                  <TableCell className="text-right">{num(row.marginScore)}</TableCell>
                  <TableCell className="text-right">{num(row.score)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={row.confidenceLevel === "high" ? "default" : "secondary"}>
                      {row.confidenceLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={pairTypeBadgeClass(row.pairType)}>
                      {pairTypeLabel(row.pairType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelected(row)}>
                      Explain
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {selected ? `${selected.menuA} + ${selected.menuB}` : "Explainability"}
            </SheetTitle>
            <SheetDescription>
              Deterministic metrics that drive this ranking.
            </SheetDescription>
          </SheetHeader>

          {selected && (
            <div className="space-y-3 px-4 pb-4 text-sm">
              {explainability(selected).map((line) => (
                <p key={line} className="text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
