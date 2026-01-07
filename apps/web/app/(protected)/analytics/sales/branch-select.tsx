"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useAnalytics } from "../use-analytics";

type Branch = {
  id: number;
  name: string;
};

interface BranchSelectProps {
  branches: Branch[];
  placeholder?: string;
}

export function BranchSelect({
  branches,
  placeholder = "Select branch",
}: BranchSelectProps) {
  const { branchId, setBranchId } = useAnalytics();

  return (
    <div className="max-w-xs">
      <Select
        value={branchId !== null ? String(branchId) : undefined}
        onValueChange={(val) => setBranchId(val ? Number(val) : null)}
      >
        <SelectTrigger>
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
