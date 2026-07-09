"use client";

import { useEffect, useState } from "react";
import { App, Button } from "antd";
import { BellOutlined, BellFilled } from "@ant-design/icons";
import { savePushSubscription, removePushSubscription } from "@/server/actions/push";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "denied" | "off" | "on" | "loading";

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const { message } = App.useApp();
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    const supported =
      !!VAPID &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    if (!supported) {
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
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID!),
      });
      const json = sub.toJSON();
      await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
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
        size="middle"
        shape="circle"
        type={on ? "default" : "primary"}
        loading={state === "loading"}
        icon={on ? <BellFilled /> : <BellOutlined />}
        onClick={on ? disable : enable}
        aria-label={on ? "Notifications on" : "Enable notifications"}
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
