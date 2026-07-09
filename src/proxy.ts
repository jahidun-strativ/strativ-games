import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

// Protects all app routes: redirects signed-out visitors to /auth/sign-in and
// refreshes sessions. The (app) layout re-checks the session server-side.
const authMiddleware = auth.middleware({ loginUrl: "/auth/sign-in" });

export default function proxy(request: NextRequest) {
  // Let Server Actions pass through — they do their own auth check.
  if (request.headers.has("Next-Action")) return;
  return authMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next|api/auth|auth|icons|favicon\\.ico|sw\\.js|offline\\.html|manifest\\.webmanifest|.*\\.(?:png|svg|jpg|jpeg|webp|ico)).*)",
  ],
};
