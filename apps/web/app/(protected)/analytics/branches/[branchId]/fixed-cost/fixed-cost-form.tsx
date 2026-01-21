"use client";

import { useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Card } from "@workspace/ui/components/card";

type FixedCost = {
  id: number;
  name: string;
  amount: number;
  category: string;
  notes: string;
  isActive: boolean;
};

type Props = {
  branchId: number;
  fixedCosts: FixedCost[];
};

export function FixedCostForm({ branchId, fixedCosts }: Props) {
  const [items, setItems] = useState<FixedCost[]>(fixedCosts);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const res = await fetch(
        `/api/branches/${branchId}/fixed-costs/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            amount: item.amount,
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

      const amount = Number(newItem.amount);

      if (!newItem.name || !amount || amount <= 0) {
        setError("Name and a positive amount are required.");
        return;
      }

      const res = await fetch(`/api/branches/${branchId}/fixed-costs`, {
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

      // 🔥 FIX: unwrap API response
      const data = await res.json();
      const created: FixedCost = data.fixedCost;

      setItems((prev) => [...prev, created]);
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

      const res = await fetch(`/api/branches/${branchId}/fixed-costs/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete fixed cost");
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError("Failed to delete fixed cost. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Existing fixed costs */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Fixed Costs</h2>

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
                  <Input
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item.id, { name: e.target.value })
                    }
                  />
                </TableCell>

                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) =>
                      updateItem(item.id, {
                        amount: Number(e.target.value),
                      })
                    }
                  />
                </TableCell>

                <TableCell>
                  <Input
                    value={item.category}
                    onChange={(e) =>
                      updateItem(item.id, {
                        category: e.target.value,
                      })
                    }
                  />
                </TableCell>

                <TableCell>
                  <Input
                    value={item.notes}
                    onChange={(e) =>
                      updateItem(item.id, { notes: e.target.value })
                    }
                  />
                </TableCell>

                <TableCell>
                  <Checkbox
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
                    variant="outline"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => saveItem(item)}
                  >
                    Save
                  </Button>

                  <Button
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
      </Card>

      {/* Add new fixed cost */}
      <Card className="p-4">
        <h3 className="text-md font-semibold mb-3">Add Fixed Cost</h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input
            placeholder="Name"
            value={newItem.name}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
          />

          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={newItem.amount}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                amount: e.target.value,
              }))
            }
          />

          <Input
            placeholder="Category"
            value={newItem.category}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                category: e.target.value,
              }))
            }
          />

          <Input
            placeholder="Notes"
            value={newItem.notes}
            onChange={(e) =>
              setNewItem((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
          />

          <Button disabled={isSaving} onClick={createItem}>
            Add
          </Button>
        </div>
      </Card>
    </div>
  );
}
