import { MenuyuktiSignIn } from "@/components/clerk/menuyukti-sign-in";
import { routes } from "@/lib/routes";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const { userId } = await auth();
  if (userId) {
    redirect(routes.campaigns.list);
  }

  const t = await getTranslations("login");

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-[min(100%,28rem)]">
        <Button variant="ghost" className="mb-6 -ml-2 gap-2 text-muted-foreground" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" aria-hidden />
            {t("backToHome")}
          </Link>
        </Button>

        <Card className="border shadow-sm">
          <CardHeader className="space-y-3 pb-2">
            <CardTitle className="text-3xl tracking-tight text-foreground md:text-4xl">
              {t("title")}
            </CardTitle>
            <p className="text-lg leading-snug text-foreground/90 md:text-xl">
              {t("slogan")}
            </p>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </CardHeader>
          <CardContent className="pt-2">
            <MenuyuktiSignIn />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
