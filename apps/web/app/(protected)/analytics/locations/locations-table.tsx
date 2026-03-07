"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

interface Branch {
  id: number;
  name: string;
}

interface LocationsTableProps {
  branches: Branch[];
  emptyLabel: string;
  indexLabel: string;
  branchNameLabel: string;
}

export function LocationsTable({
  branches,
  emptyLabel,
  indexLabel,
  branchNameLabel,
}: LocationsTableProps) {
  return (
    <div className="border w-full">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">{indexLabel}</TableHead>
            <TableHead>{branchNameLabel}</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {branches.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={2}
                className="text-center text-muted-foreground"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}

          {branches.map((branch, index) => (
            <TableRow key={branch.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{branch.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
