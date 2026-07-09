"use client";

import { useCallback, useEffect, useState } from "react";
import { App, Button, Tooltip } from "antd";
import { BellOutlined, BellFilled } from "@ant-design/icons";
import { removePushSubscription } from "@/server/actions/push";
import {
  PUSH_CHANGED_EVENT,
  getPushState,
  notifyPushChanged,
  subscribeToPush,
  type PushState,
} from "@/lib/push-client";

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const { message } = App.useApp();
  const [state, setState] = useState<PushState>("loading");

  const refresh = useCallback(() => {
    void getPushState().then(setState);
  }, []);

  // Re-sync on mount, whenever a subscription changes anywhere (e.g. the
  // auto-prompt subscribing), and when the tab regains focus (permission may
  // have been granted from the OS prompt while we were backgrounded).
  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener(PUSH_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(PUSH_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  async function enable() {
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      await subscribeToPush(); // notifies other toggles too
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
      notifyPushChanged();
      message.success("Notifications turned off on this device.");
    } catch {
      setState("on");
    }
  }

  if (state === "unsupported") return null;

  const on = state === "on";
  const loading = state === "loading";

  // Compact icon-only button for the mobile top bar.
  if (compact) {
    if (state === "denied") return null;
    const label = on ? "Notifications on — tap to turn off" : "Enable notifications";
    return (
      <Tooltip title={label}>
        <Button
          shape="circle"
          type={on ? "default" : "primary"}
          loading={loading}
          icon={on ? <BellFilled /> : <BellOutlined />}
          onClick={on ? disable : enable}
          aria-label={label}
          // Green = on, orange = needs enabling. Sized to match the profile
          // avatar (shadcn icon = 36px) so the two navbar controls line up.
          className={`!h-9 !w-9 !min-w-9 ${
            on ? "!border-pitch-600 !bg-pitch-600 !text-white" : ""
          }`}
        />
      </Tooltip>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-xs text-ink-500">
        Notifications are blocked in your browser settings.
      </p>
    );
  }

  return (
    <Button
      block
      size="small"
      type={on ? "default" : "primary"}
      loading={loading}
      icon={on ? <BellFilled /> : <BellOutlined />}
      onClick={on ? disable : enable}
      className={on ? "!border-pitch-600 !text-pitch-500" : ""}
    >
      {on ? "Notifications on · tap to turn off" : "Enable notifications"}
    </Button>
  );
}
