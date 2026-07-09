import type { ReactNode } from "react";
import { InboxOutlined } from "@/components/icons";

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="tv-card flex flex-col items-center gap-4 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-200 text-2xl text-ink-500">
        {icon ?? <InboxOutlined />}
      </span>
      <div>
        <p className="font-display text-lg text-ink-900">{title}</p>
        {hint ? <p className="mx-auto mt-1 max-w-xs text-sm text-ink-500">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}
