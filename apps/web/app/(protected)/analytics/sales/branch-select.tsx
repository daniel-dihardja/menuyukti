"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Label } from "@workspace/ui/components/label";
import { useAnalytics } from "../use-analytics";

type Branch = {
  id: number;
  name: string;
};

interface BranchSelectProps {
  branches: Branch[];
  placeholder?: string;
  id?: string;
  label?: string;
}

export function BranchSelect({
  branches,
  placeholder = "Select branch",
  id,
  label,
}: BranchSelectProps) {
  const { branchId, setBranchId } = useAnalytics();
  const selectId = id ?? "branch-select";

  return (
    <div className="max-w-xs space-y-2">
      {label ? <Label htmlFor={selectId}>{label}</Label> : null}
      <Select
        value={branchId !== null ? String(branchId) : undefined}
        onValueChange={(val) => setBranchId(val ? Number(val) : null)}
      >
        <SelectTrigger id={selectId} aria-label={label ?? placeholder}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={String(branch.id)}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
