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
import { routes } from "@/lib/routes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export function CreateBranchForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState("IDR");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formRef.current) return;

    const formData = new FormData(formRef.current);

    const payload = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      currencyCode,
    };

    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to create branch");
      }

      router.push(routes.analytics.branches);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} className="space-y-4" onSubmit={onSubmit}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create Branch</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Branch name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Berlin Mitte"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="berlin-mitte"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currencyCode">Currency</Label>
              <Select
                value={currencyCode}
                onValueChange={setCurrencyCode}
                disabled={loading}
              >
                <SelectTrigger id="currencyCode">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR – Indonesian Rupiah</SelectItem>
                  <SelectItem value="USD">USD – US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR – Euro</SelectItem>
                  <SelectItem value="GBP">GBP – British Pound</SelectItem>
                  <SelectItem value="SGD">SGD – Singapore Dollar</SelectItem>
                  <SelectItem value="AUD">AUD – Australian Dollar</SelectItem>
                  <SelectItem value="JPY">JPY – Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create branch"}
        </Button>
      </div>
    </form>
  );
}
