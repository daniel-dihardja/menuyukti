"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface Branch {
  id: number;
  name: string;
}

interface Upload {
  id: number;
  name: string;
}

interface SalesTableProps {
  branches: Branch[];
  uploads: Upload[];
  labels: {
    index: string;
    fileName: string;
    action: string;
    view: string;
    selectBranch: string;
  };
}

export function SalesTable({ branches, uploads, labels }: SalesTableProps) {
  const [branchId, setBranchId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Branch selector */}
      <div className="max-w-xs">
        <Select onValueChange={(value) => setBranchId(Number(value))}>
          <SelectTrigger>
            <SelectValue placeholder={labels.selectBranch} />
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

      {/* Table */}
      <div className="border w-full">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">{labels.index}</TableHead>
              <TableHead>{labels.fileName}</TableHead>
              <TableHead className="text-right">{labels.action}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {uploads.map((file, index) => (
              <TableRow key={file.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{file.name}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" disabled={!branchId}>
                    {labels.view}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
