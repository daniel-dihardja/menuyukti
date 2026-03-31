"use client";

import { SignIn } from "@clerk/nextjs";
import { routes } from "@/lib/routes";
import { menuyuktiClerkAppearance } from "./menuyukti-appearance";

export function MenuyuktiSignIn() {
  return (
    <SignIn
      path="/login"
      routing="path"
      signUpUrl={routes.signUp}
      forceRedirectUrl={routes.campaigns.list}
      appearance={menuyuktiClerkAppearance}
    />
  );
}
