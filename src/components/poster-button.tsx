"use client";

import { Dropdown } from "antd";
import { Button } from "@/components/ui/button";

export type PosterVariant = {
  label: string;
  variant: "full" | "vs" | "squad";
  hint?: string;
};

// "Generate picture" launcher. Each variant opens the branded PNG in a new tab
// (view + save); the ⤓ items force a file download of the same image.
export function PosterButton({
  basePath,
  variants,
  label = "🖼️ Generate picture",
}: {
  basePath: string; // e.g. "/matches/<id>/poster"
  variants: PosterVariant[];
  label?: string;
}) {
  const open = (variant: string, download: boolean) => {
    const q = new URLSearchParams({ variant });
    if (download) q.set("download", "1");
    window.open(`${basePath}?${q}`, "_blank", "noopener");
  };

  const items = variants.flatMap((v) => [
    {
      key: `${v.variant}-view`,
      label: (
        <div className="flex flex-col py-0.5">
          <span className="font-semibold">{v.label}</span>
          {v.hint ? <span className="text-xs text-ink-500">{v.hint}</span> : null}
        </div>
      ),
      onClick: () => open(v.variant, false),
    },
    {
      key: `${v.variant}-dl`,
      label: <span className="text-ink-500">⤓ Download {v.label}</span>,
      onClick: () => open(v.variant, true),
    },
    { type: "divider" as const, key: `${v.variant}-div` },
  ]);
  // Drop the trailing divider.
  if (items.length) items.pop();

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <span>
        <Button variant="secondary">{label}</Button>
      </span>
    </Dropdown>
  );
}
