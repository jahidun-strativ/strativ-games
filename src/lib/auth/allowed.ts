// Only Strativ staff may use the portal. Neon Auth can't yet restrict sign-ups
// at the service level, so we gate access here: anyone can create an account,
// but non-strativ.se accounts are blocked from every page and server action.
export const ALLOWED_EMAIL_DOMAIN = "strativ.se";

export function isAllowedEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().trim().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}
