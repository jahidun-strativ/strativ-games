"use client";

import { useEffect } from "react";
import { pushSupported, subscribeToPush } from "@/lib/push-client";

// Once per device, right after the user first reaches the signed-in app, ask
// for notification permission automatically instead of waiting for them to tap
// the bell. Runs only when permission is still "default" and we haven't asked
// before; the manual bell toggle remains available either way.
const PROMPTED_KEY = "ssm-push-auto-prompted";

export function PushAutoPrompt() {
  useEffect(() => {
    if (!pushSupported()) return;
    if (Notification.permission !== "default") return; // already granted or blocked
    if (localStorage.getItem(PROMPTED_KEY)) return; // only auto-ask once per device

    // Mark before asking so a dismissed/blocked prompt is never re-shown on
    // every load; the user can still enable later via the bell.
    localStorage.setItem(PROMPTED_KEY, "1");

    void (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") await subscribeToPush();
      } catch {
        // Some browsers (notably iOS Safari) require a user gesture; if the
        // auto-request is rejected, the bell toggle still works.
      }
    })();
  }, []);

  return null;
}
