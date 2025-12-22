import { SidebarInset } from "@workspace/ui/components/sidebar";
import { getTranslations } from "next-intl/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";
import Link from "next/link";
import { routes } from "@/lib/routes";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";

export default async function Page() {
  const t = await getTranslations("analytics.branches");

  const branches = [
    { id: "b1", name: "Berlin Mitte", city: "Berlin" },
    { id: "b2", name: "Hamburg Hafen", city: "Hamburg" },
  ];

  return (
    <SidebarInset>
      <div className="w-full">
        <SidebarTriggerClient title={t("title")} />

        <main className="p-4 space-y-3 max-w-6xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={routes.analytics.sales}>Analytics</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>{t("title")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="border w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">{t("table.index")}</TableHead>
                  <TableHead>{t("table.branchName")}</TableHead>
                  <TableHead>{t("table.city")}</TableHead>
                  <TableHead className="text-right">
                    {t("table.action")}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {branches.map((branch, index) => (
                  <TableRow key={branch.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{branch.name}</TableCell>
                    <TableCell>{branch.city}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">
                        {t("table.view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button asChild>
              <Link href={routes.analytics.branchesCreate}>{t("create")}</Link>
            </Button>
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}
