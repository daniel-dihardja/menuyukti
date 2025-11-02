"use client";

import { Separator } from "@workspace/ui/components/separator";
import { SidebarInset, SidebarTrigger } from "@workspace/ui/components/sidebar";
import { useTranslations } from "next-intl";

export default function Page() {
  const t = useTranslations("import");
  return (
    <SidebarInset>
      {/* ---------- HEADER ---------- */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <h1>{t("title")}</h1>
      </header>

      {/* ---------- MAIN CONTENT ---------- */}
      <div className="p-4"></div>
    </SidebarInset>
  );
}
