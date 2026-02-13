"use client";

import { useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Card } from "@workspace/ui/components/card";
import {
  formatCurrencyInput,
  getCurrencyLocale,
  parseCurrencyInput,
} from "@/lib/currency";

type FixedCost = {
  id: number;
  name: string;
  amount: number;
  category: string | null;
  notes: string | null;
  isActive: boolean;
};

type Props = {
  branchId: number;
  fixedCosts: FixedCost[];
  currencyCode: string;
};

export function FixedCostForm({ branchId, fixedCosts, currencyCode }: Props) {
  const locale = getCurrencyLocale(currencyCode);
  const [items, setItems] = useState<FixedCost[]>(() =>
    fixedCosts.map((item) => ({
      ...item,
      category: item.category ?? "",
      notes: item.notes ?? "",
    })),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAmountId, setActiveAmountId] = useState<number | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<number, string>>(() =>
    Object.fromEntries(fixedCosts.map((item) => [item.id, String(item.amount)])),
  );

  const [newItem, setNewItem] = useState({
    name: "",
    amount: "",
    category: "",
    notes: "",
  });

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------
  const updateItem = (id: number, patch: Partial<FixedCost>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  // --------------------------------------------------
  // API calls
  // --------------------------------------------------
  const saveItem = async (item: FixedCost) => {
    try {
      setIsSaving(true);
      setError(null);
      const parsedAmount = parseCurrencyInput(
        amountDrafts[item.id] ?? "",
        currencyCode,
        locale,
      );

      if (parsedAmount === null || parsedAmount <= 0) {
        setError("Amount must be a positive number.");
        return;
      }

      updateItem(item.id, { amount: parsedAmount });

      const res = await fetch(
        `/api/locations/${branchId}/fixed-costs/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            amount: parsedAmount,
            category: item.category || null,
            notes: item.notes || null,
            isActive: item.isActive,
          }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to save fixed cost");
      }
    } catch (err) {
      setError("Failed to update fixed cost. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const createItem = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const amount = parseCurrencyInput(newItem.amount, currencyCode, locale);

      if (!newItem.name || amount === null || amount <= 0) {
        setError("Name and a positive amount are required.");
        return;
      }

      const res = await fetch(`/api/locations/${branchId}/fixed-costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name,
          amount,
          category: newItem.category || null,
          notes: newItem.notes || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create fixed cost");
      }

      // unwrap API response
      const data = await res.json();
      const created: FixedCost = {
        ...data.fixedCost,
        category: data.fixedCost.category ?? "",
        notes: data.fixedCost.notes ?? "",
      };

      setItems((prev) => [...prev, created]);
      setAmountDrafts((prev) => ({ ...prev, [created.id]: String(created.amount) }));
      setNewItem({ name: "", amount: "", category: "", notes: "" });
    } catch (err) {
      setError("Failed to add fixed cost. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (id: number) => {
    try {
      setIsSaving(true);
      setError(null);

      const res = await fetch(`/api/locations/${branchId}/fixed-costs/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete fixed cost");
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setAmountDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError("Failed to delete fixed cost. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  const formatDisplayAmount = (raw: string) => {
    const parsed = parseCurrencyInput(raw, currencyCode, locale);
    if (parsed === null) return "";
    return formatCurrencyInput(parsed, currencyCode, locale);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {/* Add new fixed cost */}
      <Card className="p-4">
        <h3 className="text-md font-semibold mb-3">Add Fixed Cost</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Label htmlFor="new-fixed-cost-name" className="sr-only">
            New fixed cost name
          </Label>
          <Input
            id="new-fixed-cost-name"
            placeholder="Name"
            value={newItem.name}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
          />

          <div className="relative">
            <span
              className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
              aria-hidden="true"
            >
              {currencyCode}
            </span>
            <Label htmlFor="new-fixed-cost-amount" className="sr-only">
              New fixed cost amount
            </Label>
            <Input
              id="new-fixed-cost-amount"
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              value={newItem.amount}
              onChange={(e) =>
                setNewItem((prev) => ({
                  ...prev,
                  amount: e.target.value,
                }))
              }
              className="pl-10 text-right tabular-nums"
            />
          </div>

          <Label htmlFor="new-fixed-cost-category" className="sr-only">
            New fixed cost category
          </Label>
          <Input
            id="new-fixed-cost-category"
            placeholder="Category"
            value={newItem.category}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                category: e.target.value,
              }))
            }
          />

          <Label htmlFor="new-fixed-cost-notes" className="sr-only">
            New fixed cost notes
          </Label>
          <Input
            id="new-fixed-cost-notes"
            placeholder="Notes"
            value={newItem.notes}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
          />

        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            disabled={isSaving}
            onClick={createItem}
            className="w-full sm:w-auto"
          >
            Add
          </Button>
        </div>
      </Card>

      {/* Existing fixed costs */}
      <Card className="border-0 p-0 md:border md:p-4">
        <div className="space-y-3 md:hidden">
          {items.length === 0 && (
            <div className="rounded-md border p-4 text-center text-muted-foreground">
              No fixed costs yet
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="space-y-3 border p-3">
              <div className="space-y-2">
                <Label htmlFor={`fixed-cost-name-mobile-${item.id}`}>Name</Label>
                <Input
                  id={`fixed-cost-name-mobile-${item.id}`}
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`fixed-cost-amount-mobile-${item.id}`}>Amount</Label>
                <div className="relative">
                  <span
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                    aria-hidden="true"
                  >
                    {currencyCode}
                  </span>
                  <Input
                    id={`fixed-cost-amount-mobile-${item.id}`}
                    type="text"
                    inputMode="decimal"
                    value={
                      activeAmountId === item.id
                        ? (amountDrafts[item.id] ?? "")
                        : formatDisplayAmount(amountDrafts[item.id] ?? "")
                    }
                    onChange={(e) =>
                      setAmountDrafts((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    onFocus={() => setActiveAmountId(item.id)}
                    onBlur={() =>
                      setActiveAmountId((prev) => (prev === item.id ? null : prev))
                    }
                    className="pl-10 text-right tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`fixed-cost-category-mobile-${item.id}`}>Category</Label>
                <Input
                  id={`fixed-cost-category-mobile-${item.id}`}
                  value={item.category ?? ""}
                  onChange={(e) =>
                    updateItem(item.id, {
                      category: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`fixed-cost-notes-mobile-${item.id}`}>Notes</Label>
                <Input
                  id={`fixed-cost-notes-mobile-${item.id}`}
                  value={item.notes ?? ""}
                  onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor={`fixed-cost-active-mobile-${item.id}`}>Active</Label>
                <Checkbox
                  id={`fixed-cost-active-mobile-${item.id}`}
                  checked={item.isActive}
                  onCheckedChange={(checked) =>
                    updateItem(item.id, {
                      isActive: Boolean(checked),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => saveItem(item)}
                >
                  Save
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSaving}
                  onClick={() => deleteItem(item.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No fixed costs yet
                  </TableCell>
                </TableRow>
              )}

              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Label htmlFor={`fixed-cost-name-${item.id}`} className="sr-only">
                      Name for {item.name || `fixed cost ${item.id}`}
                    </Label>
                    <Input
                      id={`fixed-cost-name-${item.id}`}
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, { name: e.target.value })
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <div className="relative">
                      <span
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                        aria-hidden="true"
                      >
                        {currencyCode}
                      </span>
                      <Label
                        htmlFor={`fixed-cost-amount-${item.id}`}
                        className="sr-only"
                      >
                        Amount for {item.name || `fixed cost ${item.id}`}
                      </Label>
                      <Input
                        id={`fixed-cost-amount-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        value={
                          activeAmountId === item.id
                            ? (amountDrafts[item.id] ?? "")
                            : formatDisplayAmount(amountDrafts[item.id] ?? "")
                        }
                        onChange={(e) =>
                          setAmountDrafts((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        onFocus={() => setActiveAmountId(item.id)}
                        onBlur={() =>
                          setActiveAmountId((prev) =>
                            prev === item.id ? null : prev,
                          )
                        }
                        className="pl-10 text-right tabular-nums"
                      />
                    </div>
                  </TableCell>

                  <TableCell>
                    <Label
                      htmlFor={`fixed-cost-category-${item.id}`}
                      className="sr-only"
                    >
                      Category for {item.name || `fixed cost ${item.id}`}
                    </Label>
                    <Input
                      id={`fixed-cost-category-${item.id}`}
                      value={item.category ?? ""}
                      onChange={(e) =>
                        updateItem(item.id, {
                          category: e.target.value,
                        })
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Label htmlFor={`fixed-cost-notes-${item.id}`} className="sr-only">
                      Notes for {item.name || `fixed cost ${item.id}`}
                    </Label>
                    <Input
                      id={`fixed-cost-notes-${item.id}`}
                      value={item.notes ?? ""}
                      onChange={(e) =>
                        updateItem(item.id, { notes: e.target.value })
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Label htmlFor={`fixed-cost-active-${item.id}`} className="sr-only">
                      Active status for {item.name || `fixed cost ${item.id}`}
                    </Label>
                    <Checkbox
                      id={`fixed-cost-active-${item.id}`}
                      checked={item.isActive}
                      onCheckedChange={(checked) =>
                        updateItem(item.id, {
                          isActive: Boolean(checked),
                        })
                      }
                    />
                  </TableCell>

                  <TableCell className="text-right space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => saveItem(item)}
                    >
                      Save
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => deleteItem(item.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

    </div>
  );
}
