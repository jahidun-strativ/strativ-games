"use client";

import { useState, useTransition } from "react";
import { App, Modal } from "antd";
import { Button } from "@/components/ui/button";
import { TeamBanner } from "@/components/team-banner";
import { setTeamBanner } from "@/server/actions/teams";

// Admin control: shuffle through generated banner looks and save the chosen one.
export function TeamBannerGenerator({
  teamId,
  teamName,
  currentSeed,
}: {
  teamId: string;
  teamName: string;
  currentSeed: number | null;
}) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<number>(currentSeed ?? 0);
  const [isPending, startTransition] = useTransition();

  const shuffle = () => setSeed(Math.floor(Math.random() * 1_000_000_000));

  const save = () =>
    startTransition(async () => {
      try {
        await setTeamBanner(teamId, seed);
        message.success("Banner saved.");
        setOpen(false);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Couldn't save the banner.");
      }
    });

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setSeed(currentSeed ?? 0);
          setOpen(true);
        }}
      >
        🎨 Banner
      </Button>
      <Modal
        title="Team banner"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-line">
            <TeamBanner name={teamName} seed={seed} variant="hero" className="h-40 w-full" />
            <div className="absolute inset-0 flex items-end p-4">
              <p className="font-display text-2xl text-white">{teamName}</p>
            </div>
          </div>
          <p className="text-sm text-ink-500">Shuffle to try different looks, then save.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={shuffle}>
              Shuffle
            </Button>
            <Button onClick={save} disabled={isPending}>
              Save banner
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
