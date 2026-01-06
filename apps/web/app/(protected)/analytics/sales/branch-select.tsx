"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

type Branch = {
  id: number;
  name: string;
};

interface BranchSelectProps {
  branches: Branch[];
  value: number | null;
  onChange: (branchId: number | null) => void;
  placeholder?: string;
}

export function BranchSelect({
  branches,
  value,
  onChange,
  placeholder = "Select branch",
}: BranchSelectProps) {
  return (
    <div className="max-w-xs">
      <Select
        value={value !== null ? String(value) : undefined}
        onValueChange={(val) => onChange(Number(val))}
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
