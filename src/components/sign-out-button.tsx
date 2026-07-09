"use client";

import { useState } from "react";
import { Button } from "antd";
import { authClient } from "@/lib/auth/client";

export function SignOutButton({
  children = "Sign out",
  block,
}: {
  children?: React.ReactNode;
  block?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="primary"
      block={block}
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await authClient.signOut();
        window.location.href = "/auth/sign-in";
      }}
    >
      {children}
    </Button>
  );
}
