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
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
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
