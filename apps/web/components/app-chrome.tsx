"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

const HIDE_HEADER_PREFIXES = ["/login", "/sign-up"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader =
    pathname != null &&
    HIDE_HEADER_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

  return (
    <>
      {!hideHeader && (
        <header className="flex items-center justify-end gap-2 border-b px-4 py-2">
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton />
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </header>
      )}
      {children}
    </>
  );
}
