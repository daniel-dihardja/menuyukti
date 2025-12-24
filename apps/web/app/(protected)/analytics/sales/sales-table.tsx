"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";

interface Upload {
  id: number;
  name: string;
}

interface SalesTableProps {
  uploads: Upload[];
  labels: {
    index: string;
    fileName: string;
    action: string;
    view: string;
  };
}

export function SalesTable({ uploads, labels }: SalesTableProps) {
  return (
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
                <Button size="sm" variant="outline">
                  {labels.view}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
