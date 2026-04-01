export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { routes } from "@/lib/routes";

/**
 * Legacy URL: campaign creation now starts from the campaigns list
 * (create in DB, then navigate to /campaigns/[id]).
 */
export default async function Page() {
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }
  redirect(routes.campaigns.list);
}
