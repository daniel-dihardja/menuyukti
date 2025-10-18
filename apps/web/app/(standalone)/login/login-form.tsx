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
    <div className={cn("w-screen md:w-[600px] p-6", className)} {...props}>
      <Card className="w-full md:p-8 md:py-12 border">
        <CardHeader className="space-y-3">
          {/* Title */}
          <CardTitle className="text-4xl text-foreground tracking-tight mb-0">
            {t("title")}
          </CardTitle>

          {/* ✨ Slogan */}
          <p className="text-xl leading-snug text-foreground/90">
            {t("slogan")}
          </p>

          {/* Description */}
          {/* <CardDescription className="text-base text-muted-foreground mt-2 max-w-prose leading-relaxed">
            {t("description")}
          </CardDescription> */}
        </CardHeader>

        <CardContent>
          <form className="space-y-8">
            <FieldGroup>
              {/* Email Field */}
              <Field>
                <FieldLabel
                  htmlFor="email"
                  className="text-base font-medium text-foreground"
                >
                  {t("emailLabel")}
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  required
                  className="text-base py-2"
                />
              </Field>

              {/* Password Field */}
              <Field>
                <div className="flex items-center">
                  <FieldLabel
                    htmlFor="password"
                    className="text-base font-medium text-foreground"
                  >
                    {t("passwordLabel")}
                  </FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm md:text-base underline-offset-4 hover:underline text-primary"
                  >
                    {t("forgotPassword")}
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  className="text-base py-2"
                />
              </Field>

              {/* Buttons */}
              <Field>
                <Link href={routes.myuk}>
                  <Button className="w-full text-base py-3">
                    {t("loginButton")}
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  type="button"
                  className="w-full mt-3 text-base py-3"
                >
                  {t("loginWithGoogle")}
                </Button>

                {/* Sign up */}
                <FieldDescription className="text-center text-base mt-6">
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
