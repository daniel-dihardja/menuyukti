import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@workspace/ui/lib/utils";

type LoginFormProps = React.ComponentProps<"div">;

export async function LoginForm({ className, ...props }: LoginFormProps) {
  const t = await getTranslations("login");

  return (
    <div className={cn("w-screen md:w-[600px]", className)} {...props}>
      <Card className="w-full shadow-md p-4 md:p-6">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-bold text-foreground tracking-tight">
            {t("title")}
          </CardTitle>

          {/* ✨ Slogan */}
          <p className="text-lg font-semibold whitespace-nowrap truncate">
            {t("slogan")}
          </p>

          <CardDescription className="text-muted-foreground text-sm mt-1 max-w-prose">
            {t("description")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t("emailLabel")}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  required
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">
                    {t("passwordLabel")}
                  </FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    {t("forgotPassword")}
                  </a>
                </div>
                <Input id="password" type="password" required />
              </Field>

              <Field>
                <Link href={routes.myuk}>
                  <Button className="w-full">{t("loginButton")}</Button>
                </Link>

                <Button variant="outline" type="button" className="w-full mt-2">
                  {t("loginWithGoogle")}
                </Button>

                <FieldDescription className="text-center text-sm mt-4">
                  {t("signupDescription")}{" "}
                  <a href="#" className="underline hover:text-primary">
                    {t("signupLink")}
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
