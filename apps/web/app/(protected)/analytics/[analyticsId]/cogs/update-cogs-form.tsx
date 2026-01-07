"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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
};

type Props = {
  analyticsId: number;
  menuItems: MenuItem[];
};

export function UpdateCogsForm({ analyticsId, menuItems }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formRef.current) return;

    const formData = new FormData(formRef.current);

    const items = menuItems.map((item) => ({
      id: item.id,
      cogs: Number(formData.get(`cogs-${item.id}`)),
    }));

    try {
      const res = await fetch(`/api/analytics/${analyticsId}/cogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to update COGS");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} className="space-y-4" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Edit COGS per menu item</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {menuItems.map((item, index) => (
            <div
              key={item.id}
              className="
      grid grid-cols-[2.5rem_auto_8rem] items-center gap-2
      rounded-md px-2 py-1
      transition-colors
      focus-within:bg-muted
      focus-within:ring-1 focus-within:ring-primary/40
    "
            >
              {/* Counter */}
              <span className="text-sm text-muted-foreground tabular-nums">
                {index + 1}.
              </span>

              {/* Label */}
              <Label htmlFor={`cogs-${item.id}`} className="truncate">
                {item.menuName}
              </Label>

              {/* Input */}
              <Input
                id={`cogs-${item.id}`}
                name={`cogs-${item.id}`}
                type="number"
                step="0.01"
                defaultValue={item.cogs ?? ""}
                placeholder="0.00"
                disabled={loading}
              />
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save COGS"}
        </Button>
      </div>
    </form>
  );
}
