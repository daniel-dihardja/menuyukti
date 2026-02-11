"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

type MenuItem = {
  id: number;
  menuName: string;
  cogs: number | null;
  quantity: number;
  totalRevenue: number;
  menuCategory: string | null;
};

type Props = {
  analyticsId: number;
  menuItems: MenuItem[];
  analyticsOptions: Array<{ id: number; name: string }>;
  currencyCode: string;
};

export function UpdateCogsForm({
  analyticsId,
  menuItems,
  analyticsOptions,
  currencyCode,
}: Props) {
  const router = useRouter();
  const t = useTranslations("analytics.cogsForm");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importId, setImportId] = useState<number | null>(() => {
    return analyticsOptions[0]?.id ?? null;
  });
  const [importing, setImporting] = useState(false);
  const [cogsValues, setCogsValues] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const item of menuItems) {
      initial[item.id] = item.cogs === null ? "" : String(item.cogs);
    }
    return initial;
  });

  const options = useMemo(() => analyticsOptions, [analyticsOptions]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // ✅ Correctly normalize values
    const items = menuItems.map((item) => {
      const raw = cogsValues[item.id] ?? "";
      const value = raw === "" ? null : Number(raw);

      return {
        id: item.id,
        cogs: value,
        quantity: item.quantity,
        totalRevenue: item.totalRevenue,
        menuName: item.menuName,
      };
    });

    try {
      const res = await fetch(`/api/analytics/${analyticsId}/cogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? t("errors.updateFailed"));
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("heading")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </section>

      {options.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="import-analytics-select">
            {t("import.label")}
          </Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Select
              value={importId !== null ? String(importId) : undefined}
              onValueChange={(val) => setImportId(val ? Number(val) : null)}
              disabled={loading || importing}
            >
              <SelectTrigger id="import-analytics-select" className="w-full sm:w-[260px]">
                <SelectValue placeholder={t("import.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="secondary"
              disabled={!importId || importing || loading}
              onClick={async () => {
                if (!importId) return;
                setImporting(true);
                setError(null);
                try {
                    const res = await fetch(`/api/analytics/${importId}/cogs`);
                    if (!res.ok) {
                      throw new Error(t("errors.loadImportFailed"));
                    }
                  const data = (await res.json()) as {
                    items: Array<{ menuName: string; cogs: number | null }>;
                  };

                  const cogsByName = new Map(
                    data.items.map((item) => [item.menuName.toLowerCase(), item.cogs]),
                  );

                  setCogsValues((prev) => {
                    const next = { ...prev };
                    for (const item of menuItems) {
                      const value = cogsByName.get(item.menuName.toLowerCase());
                      if (value !== undefined && value !== null) {
                        next[item.id] = String(value);
                      }
                    }
                    return next;
                  });
                } catch (err) {
                  setError(err instanceof Error ? err.message : t("errors.unknown"));
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? t("import.importing") : t("import.action")}
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("table.title")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {menuItems.map((item, index) => (
            <div
              key={item.id}
              className="
                rounded-md px-2 py-2
                transition-colors
                focus-within:bg-muted
                focus-within:ring-1 focus-within:ring-primary/40
                sm:grid sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center sm:gap-2
              "
            >
              <div className="mb-2 flex min-w-0 items-center gap-2 sm:mb-0">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {index + 1}.
                </span>

                <Label htmlFor={`cogs-${item.id}`} className="truncate">
                  {item.menuName}
                </Label>
              </div>

              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currencyCode}
                </span>

                <Input
                  id={`cogs-${item.id}`}
                  name={`cogs-${item.id}`}
                  type="number"
                  step="0.01"
                  value={cogsValues[item.id] ?? ""}
                  onChange={(event) =>
                    setCogsValues((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  disabled={loading}
                  className="w-full pl-8 text-right tabular-nums"
                />
              </div>
            </div>
          ))}

          {error && (
            <p className="text-sm text-destructive" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? t("actions.saving") : t("actions.save")}
        </Button>
      </div>
    </form>
  );
}
