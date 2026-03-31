import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { routes } from "@/lib/routes";

const isProtectedRoute = createRouteMatcher([
  "/analytics(.*)",
  "/campaigns(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) {
    return;
  }
  const signInUrl = new URL(routes.login, req.url).href;
  await auth.protect({ unauthenticatedUrl: signInUrl });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
