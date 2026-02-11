"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { cn } from "@workspace/ui/lib/utils";
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
  description?: string;
  className?: string;
}

export function BranchSelect({
  branches,
  placeholder = "Select branch",
  id,
  label,
  description,
  className,
}: BranchSelectProps) {
  const { branchId, setBranchId } = useAnalytics();
  const selectId = id ?? "branch-select";
  const descriptionId = description ? `${selectId}-description` : undefined;

  return (
    <Field className={cn("max-w-xs space-y-2", className)}>
      {label ? <FieldLabel htmlFor={selectId}>{label}</FieldLabel> : null}
      <Select
        value={branchId !== null ? String(branchId) : undefined}
        onValueChange={(val) => setBranchId(val ? Number(val) : null)}
      >
        <SelectTrigger
          id={selectId}
          aria-label={label ?? placeholder}
          aria-describedby={descriptionId}
        >
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
      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
    </Field>
  );
}
