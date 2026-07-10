"use client";

import { useState, type ReactNode } from "react";
import { Drawer } from "antd";
import { Button } from "@/components/ui/button";

type Variant = "primary" | "secondary" | "danger" | "ghost";

// Same render-prop API as FormModal, but slides in from the right as a
// scrollable side panel — better for tall forms than a centered modal.
export function FormDrawer({
  title,
  triggerLabel,
  triggerVariant = "primary",
  children,
}: {
  title: string;
  triggerLabel: ReactNode;
  triggerVariant?: Variant;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={triggerVariant} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Drawer
        title={title}
        placement="right"
        open={open}
        onClose={() => setOpen(false)}
        // 480px on desktop, full width on phones.
        width="min(480px, 100vw)"
        destroyOnHidden
      >
        {children(() => setOpen(false))}
      </Drawer>
    </>
  );
}
