import { createNeonAuth } from "@neondatabase/auth/next/server";

if (!process.env.NEON_AUTH_BASE_URL) {
  throw new Error("Set NEON_AUTH_BASE_URL in .env (Neon console → Auth → Configuration)");
}
if (!process.env.NEON_AUTH_COOKIE_SECRET) {
  throw new Error("Set NEON_AUTH_COOKIE_SECRET in .env (openssl rand -base64 32)");
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET,
    // Cache the session in a signed cookie for ~8h before re-validating with the
    // upstream Neon Auth server. The 5-min default meant frequent upstream
    // round-trips, and a timed-out one bounced people to login early. This is a
    // cache TTL only — the real session length is set in the Neon Console, and
    // this can't extend a session past that token's actual expiry.
    sessionDataTtl: 300000,
  },
});
