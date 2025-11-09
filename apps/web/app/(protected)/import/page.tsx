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
import PageClient from "./page-client"; // ✅ Client header component

export default async function Page() {
  const t = await getTranslations("import");

  const uploads = [
    { id: 1, name: "January_Analytics.xlsx" },
    { id: 2, name: "February_Analytics.xlsx" },
  ];

  return (
    <SidebarInset>
      {/* ---------- HEADER ---------- */}
      <PageClient title={t("title")} />

      {/* ---------- MAIN CONTENT ---------- */}
      <div className="p-4 space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">{t("table.index")}</TableHead>
                <TableHead>{t("table.fileName")}</TableHead>
                <TableHead className="text-right">
                  {t("table.action")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>{file.id}</TableCell>
                  <TableCell>{file.name}</TableCell>
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

        {/* ---------- ACTION BUTTON ---------- */}
        <div className="flex justify-center">
          <Button>{t("create")}</Button>
        </div>
      </div>
    </SidebarInset>
  );
}
