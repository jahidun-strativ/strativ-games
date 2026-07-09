import { auth } from "@/lib/auth/server";
import { isAllowedEmail } from "@/lib/auth/allowed";

export async function requireUser() {
  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("Unauthorized");
  if (!isAllowedEmail(session.user.email)) {
    throw new Error("Access is restricted to strativ.se accounts.");
  }
  return session.user;
}
