'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import Link from 'next/link'
import { routes } from '@/lib/routes'

interface Branch {
  id: string
  name: string
}

interface LocationsTableProps {
  branches: Branch[]
  emptyLabel: string
  indexLabel: string
  branchNameLabel: string
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
              <TableCell colSpan={2} className="text-center text-muted-foreground">
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}

          {branches.map((branch, index) => (
            <TableRow key={branch.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <Link
                  href={routes.analytics.branchesDetail(branch.id)}
                  className="underline-offset-4 hover:underline"
                >
                  {branch.name}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
