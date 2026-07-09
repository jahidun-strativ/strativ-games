"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      Link={Link}
      defaultTheme="dark"
      redirectTo="/"
      // Email is the Strativ identity — it must not be editable.
      changeEmail={false}
      // Allow users to delete their own account (with confirmation).
      deleteUser
      localization={{
        EMAIL_PLACEHOLDER: "you@strativ.se",
        PASSWORD_PLACEHOLDER: "Your password",
      }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
