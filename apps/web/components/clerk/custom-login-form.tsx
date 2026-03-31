"use client";

import { useSignIn } from "@clerk/nextjs";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { routes } from "@/lib/routes";
import { cn } from "@workspace/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

type Step = "password" | "client_trust";

export function CustomLoginForm({ className }: { className?: string }) {
  const t = useTranslations("login");
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const [step, setStep] = useState<Step>("password");
  const [busy, setBusy] = useState(false);

  const finalizeAndRedirect = useCallback(async () => {
    if (!signIn) return;
    await signIn.finalize({
      navigate: async ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          return;
        }
        const url = decorateUrl(routes.campaigns.list);
        if (url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.push(url);
        }
      },
    });
  }, [router, signIn]);

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signIn || busy) return;

    const form = e.currentTarget;
    const emailAddress = (
      form.elements.namedItem("email") as HTMLInputElement
    ).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    setBusy(true);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        return;
      }

      if (signIn.status === "complete") {
        await finalizeAndRedirect();
        return;
      }

      if (signIn.status === "needs_second_factor") {
        return;
      }

      if (signIn.status === "needs_client_trust") {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );
        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
        }
        setStep("client_trust");
        return;
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyTrust = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signIn || busy) return;

    const form = e.currentTarget;
    const code = (form.elements.namedItem("code") as HTMLInputElement).value
      .trim();

    setBusy(true);
    try {
      await signIn.mfa.verifyEmailCode({ code });
      if (signIn.status === "complete") {
        await finalizeAndRedirect();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStartOver = async () => {
    if (!signIn) return;
    setBusy(true);
    try {
      await signIn.reset();
      setStep("password");
    } finally {
      setBusy(false);
    }
  };

  const loading = busy || fetchStatus === "fetching";
  const isSigningIn = loading;

  if (!signIn) {
    return (
      <div
        className={cn("text-sm text-muted-foreground", className)}
        aria-live="polite"
      >
        {t("signingIn")}
      </div>
    );
  }

  if (step === "client_trust") {
    return (
      <div className={cn("space-y-6", className)}>
        <form onSubmit={handleVerifyTrust} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="verify-code">{t("verificationCodeLabel")}</FieldLabel>
              <Input
                id="verify-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t("verificationCodePlaceholder")}
                required
                disabled={!signIn || isSigningIn}
                className="text-base py-2"
              />
              {errors?.fields?.code?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.fields.code.message}
                </p>
              ) : null}
            </Field>
            <Field>
              <Button
                type="submit"
                className="w-full text-base py-3"
                disabled={isSigningIn}
              >
                {isSigningIn ? t("signingIn") : t("verify")}
              </Button>
            </Field>
          </FieldGroup>
        </form>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={isSigningIn}
            onClick={() => signIn.mfa.sendEmailCode()}
          >
            {t("resendCode")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={isSigningIn}
            onClick={handleStartOver}
          >
            {t("startOver")}
          </Button>
        </div>
      </div>
    );
  }

  if (signIn.status === "needs_second_factor") {
    return (
      <div className={cn("space-y-4", className)}>
        <p className="text-sm text-muted-foreground" role="status">
          {t("additionalVerificationRequired")}
        </p>
        <Button type="button" variant="outline" onClick={handleStartOver}>
          {t("startOver")}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <form onSubmit={handlePasswordSubmit} className="space-y-8">
        <FieldGroup>
          <Field>
            <FieldLabel
              htmlFor="email"
              className="text-base font-medium text-foreground"
            >
              {t("emailLabel")}
            </FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              required
              disabled={isSigningIn}
              className="text-base py-2"
            />
            {errors?.fields?.identifier?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.fields.identifier.message}
              </p>
            ) : null}
          </Field>

          <Field>
            <FieldLabel
              htmlFor="password"
              className="text-base font-medium text-foreground"
            >
              {t("passwordLabel")}
            </FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isSigningIn}
              className="text-base py-2"
            />
            {errors?.fields?.password?.message ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.fields.password.message}
              </p>
            ) : null}
          </Field>

          <Field>
            <Button
              type="submit"
              className="w-full text-base py-3"
              disabled={isSigningIn}
            >
              {isSigningIn ? t("signingIn") : t("loginButton")}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <div id="clerk-captcha" />
    </div>
  );
}
