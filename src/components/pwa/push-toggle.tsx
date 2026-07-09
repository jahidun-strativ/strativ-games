"use client";

import { useEffect, useState } from "react";
import { App, Button } from "antd";
import { BellOutlined, BellFilled } from "@ant-design/icons";
import { removePushSubscription } from "@/server/actions/push";
import { pushSupported, subscribeToPush } from "@/lib/push-client";

type State = "unsupported" | "denied" | "off" | "on" | "loading";

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const { message } = App.useApp();
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!pushSupported()) {
      void Promise.resolve().then(() => setState("unsupported"));
      return;
    }
    if (Notification.permission === "denied") {
      void Promise.resolve().then(() => setState("denied"));
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      await subscribeToPush();
      setState("on");
      message.success("Match notifications enabled on this device.");
    } catch {
      setState("off");
      message.error("Couldn't enable notifications.");
    }
  }

  async function disable() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      message.success("Notifications turned off on this device.");
    } catch {
      setState("on");
    }
  }

  if (state === "unsupported") return null;

  // Compact icon-only button for the mobile top bar.
  if (compact) {
    if (state === "denied") return null;
    const on = state === "on";
    return (
      <Button
        shape="circle"
        type={on ? "default" : "primary"}
        loading={state === "loading"}
        icon={on ? <BellFilled /> : <BellOutlined />}
        onClick={on ? disable : enable}
        aria-label={on ? "Notifications on" : "Enable notifications"}
        // Match the profile UserButton (shadcn icon size = 36px) so the two
        // navbar controls are exactly the same width and height.
        className="!h-9 !w-9 !min-w-9"
      />
    );
  }

  if (state === "denied") {
    return (
      <p className="text-xs text-ink-500">
        Notifications are blocked in your browser settings.
      </p>
    );
  }

  const on = state === "on";
  return (
    <Button
      block
      size="small"
      type={on ? "default" : "primary"}
      loading={state === "loading"}
      icon={on ? <BellFilled /> : <BellOutlined />}
      onClick={on ? disable : enable}
    >
      {on ? "Notifications on" : "Enable notifications"}
    </Button>
  );
}
