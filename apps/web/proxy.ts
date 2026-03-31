import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { getClerkPublishableKey, getClerkSecretKey } from "@/lib/clerk-env";
import { routes } from "@/lib/routes";

const isProtectedRoute = createRouteMatcher([
  "/analytics(.*)",
  "/campaigns(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (!isProtectedRoute(req)) {
      return;
    }
    const signInUrl = new URL(routes.login, req.url).href;
    await auth.protect({ unauthenticatedUrl: signInUrl });
  },
  () => ({
    publishableKey: getClerkPublishableKey(),
    secretKey: getClerkSecretKey(),
  }),
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
