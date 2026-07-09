import { createNeonAuth } from "@neondatabase/auth/next/server";

if (!process.env.NEON_AUTH_BASE_URL) {
  throw new Error("Set NEON_AUTH_BASE_URL in .env (Neon console → Auth → Configuration)");
}
if (!process.env.NEON_AUTH_COOKIE_SECRET) {
  throw new Error("Set NEON_AUTH_COOKIE_SECRET in .env (openssl rand -base64 32)");
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET },
});
