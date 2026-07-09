"use client";

import { UserButton } from "@neondatabase/auth-ui";

export function AppUserButton({ compact = false }: { compact?: boolean }) {
  // Sidebar shows the full card with name/email; the mobile top bar shows a
  // compact avatar-only button so it never overflows the narrow header.
  // Pin the trigger + avatar to 36px so it matches the bell button exactly.
  if (compact) {
    return (
      <span className="inline-flex h-9 w-9 [&_button]:!h-9 [&_button]:!w-9 [&_img]:!h-9 [&_img]:!w-9">
        <UserButton size="icon" />
      </span>
    );
  }
  return <UserButton size="default" className="w-full" />;
}
