"use client";

import { UserButton } from "@neondatabase/auth-ui";

export function AppUserButton({ compact = false }: { compact?: boolean }) {
  // Sidebar shows the full card with name/email; the mobile top bar shows a
  // compact avatar-only button so it never overflows the narrow header.
  if (compact) return <UserButton size="icon" />;
  return <UserButton size="default" className="w-full" />;
}
