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
};

type InsightRow = PairInsightRow | ComboInsightRow;

type Props = {
  pairs: PairInsightRow[];
  combos: ComboInsightRow[];
};

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function num(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
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
    if (row.isNoisy) {
      lines.push("This pair is marked as noisy due to low sample size.");
    }
  } else {
    lines.push(`Combo opportunity score: ${num(row.score)}.`);
    lines.push(`Margin contribution score: ${num(row.marginScore)}.`);
    lines.push(`Confidence level: ${row.confidenceLevel}.`);
  }

  return lines;
}

export function PairsInsightPanels({ pairs, combos }: Props) {
  const [selected, setSelected] = useState<InsightRow | null>(null);
  const topPairs = useMemo(() => pairs.slice(0, 25), [pairs]);
  const topCombos = useMemo(() => combos.slice(0, 25), [combos]);

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
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Support</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="text-right">Lift</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Quality</TableHead>
                <TableHead className="text-right">Details</TableHead>
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
              <TableRow>
                <TableHead>Combo Candidate</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Lift</TableHead>
                <TableHead className="text-right">Margin Score</TableHead>
                <TableHead className="text-right">Opportunity Score</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="text-right">Details</TableHead>
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
