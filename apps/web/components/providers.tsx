"use client";

import * as React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // keep this if you add other providers (QueryClientProvider, etc.)
  return <>{children}</>;
}
