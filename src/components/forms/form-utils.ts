"use client";

import type { Dayjs } from "dayjs";
import { App } from "antd";
import { useTransition } from "react";
import { pickerValueToUtcIso } from "@/lib/timezone";

// Converts antd Form values into the FormData shape the server actions expect.
export function toFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean") {
      if (value) fd.set(key, "on");
      continue;
    }
    // dayjs values from DatePicker — wall clock is always app TZ (Asia/Dhaka)
    if (typeof value === "object" && "format" in (value as object)) {
      fd.set(key, pickerValueToUtcIso(value as Dayjs));
      continue;
    }
    if (typeof value === "object" && "toHexString" in (value as object)) {
      // antd ColorPicker value
      fd.set(key, (value as { toHexString: () => string }).toHexString());
      continue;
    }
    fd.set(key, String(value));
  }
  return fd;
}

function isNextControlFlow(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: string }).digest === "string" &&
    ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (err as { digest: string }).digest.startsWith("NEXT_NOT_FOUND"))
  );
}

// Wraps a FormData server action for antd's onFinish: transition + error toast.
// onSuccess runs after the action resolves (e.g. to close a modal).
export function useActionSubmit(
  action: (fd: FormData) => Promise<void>,
  onSuccess?: () => void,
) {
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const onFinish = (values: Record<string, unknown>) => {
    startTransition(async () => {
      try {
        await action(toFormData(values));
        onSuccess?.();
      } catch (err) {
        if (isNextControlFlow(err)) throw err;
        message.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  return { onFinish, isPending };
}
