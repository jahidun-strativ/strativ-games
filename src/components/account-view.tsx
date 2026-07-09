"use client";

import { AccountView as NeonAccountView } from "@neondatabase/auth-ui";

export function AccountView({ path }: { path: string }) {
  return <NeonAccountView path={path} />;
}
