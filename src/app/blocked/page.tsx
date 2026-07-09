import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { isAllowedEmail, ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/allowed";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = { title: "Access restricted" };

export default async function BlockedPage() {
  const { data: session } = await auth.getSession();
  // Not signed in → send to sign-in. Allowed account → straight to the app.
  if (!session?.user) redirect("/auth/sign-in");
  if (isAllowedEmail(session.user.email)) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="tv-card glossy w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-tvred-500/15 text-3xl">
          🔒
        </div>
        <h1 className="font-display text-2xl text-ink-900">Access restricted</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          Strativ Games is only available to{" "}
          <span className="font-semibold text-ink-700">@{ALLOWED_EMAIL_DOMAIN}</span>{" "}
          accounts. You&apos;re signed in as{" "}
          <span className="font-semibold text-ink-700">{session.user.email}</span>, which
          isn&apos;t a Strativ account.
        </p>
        <p className="mt-2 text-sm text-ink-500">
          Sign out and use your Strativ email to continue.
        </p>
        <div className="mt-6">
          <SignOutButton block>Sign out</SignOutButton>
        </div>
      </div>
    </main>
  );
}
