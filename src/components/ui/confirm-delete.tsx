"use client";

import { useTransition } from "react";
import { Button, Popconfirm } from "antd";

export function ConfirmDelete({
  action,
  label = "Delete",
  confirmMessage = "Delete this? This cannot be undone.",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmMessage?: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Popconfirm
      title={label}
      description={confirmMessage}
      okText="Delete"
      okButtonProps={{ danger: true }}
      onConfirm={() => startTransition(async () => action())}
    >
      <Button danger type="text" loading={isPending}>
        {label}
      </Button>
    </Popconfirm>
  );
}
