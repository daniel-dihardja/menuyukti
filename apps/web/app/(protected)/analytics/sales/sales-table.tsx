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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

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
    delete: string;
  };
  onDelete: (analyticsId: number) => void;
}

export function SalesTable({ uploads, labels, onDelete }: SalesTableProps) {
  return (
    <div className="border w-full rounded-md">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">{labels.index}</TableHead>
            <TableHead>{labels.fileName}</TableHead>
            <TableHead className="text-right w-[80px]">
              {labels.action}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {uploads.map((file, index) => (
            <TableRow key={file.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{file.name}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(file.id)}
                    >
                      {labels.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
