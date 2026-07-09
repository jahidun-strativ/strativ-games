"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "antd";
import { Button } from "@/components/ui/button";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function FormModal({
  title,
  triggerLabel,
  triggerVariant = "primary",
  width = 560,
  children,
}: {
  title: string;
  triggerLabel: ReactNode;
  triggerVariant?: Variant;
  width?: number;
  // Render-prop: receives a `close` fn to call on successful submit.
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={triggerVariant} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Modal
        title={title}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={width}
        destroyOnHidden
      >
        {children(() => setOpen(false))}
      </Modal>
    </>
  );
}
