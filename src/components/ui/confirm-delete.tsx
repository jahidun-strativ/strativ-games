"use client";

import { useTransition } from "react";
import { App, Button, Popconfirm } from "antd";
import { isNextControlFlow } from "@/components/forms/form-utils";

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
  const { message } = App.useApp();
  return (
    <Popconfirm
      title={label}
      description={confirmMessage}
      okText="Delete"
      okButtonProps={{ danger: true }}
      onConfirm={() =>
        startTransition(async () => {
          try {
            await action();
          } catch (err) {
            if (isNextControlFlow(err)) throw err; // let redirect/notFound bubble
            message.error(err instanceof Error ? err.message : "Couldn't delete.");
          }
        })
      }
    >
      <Button danger type="text" loading={isPending}>
        {label}
      </Button>
    </Popconfirm>
  );
}
