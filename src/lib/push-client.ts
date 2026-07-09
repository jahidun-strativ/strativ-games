// Client-side Web Push helpers, shared by the manual bell toggle and the
// automatic first-visit prompt so both subscribe identically.
import { savePushSubscription } from "@/server/actions/push";

export const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** True when this browser can register for Web Push and a VAPID key is set. */
export function pushSupported() {
  return (
    !!VAPID &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type PushState = "unsupported" | "denied" | "off" | "on" | "loading";

/** Current push status for this device, used to render the bell toggle. */
export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

// Fired after subscribing/unsubscribing so any mounted bell toggle re-syncs
// (e.g. the auto-prompt subscribing should flip the navbar bell to "on").
export const PUSH_CHANGED_EVENT = "ssm-push-changed";
export function notifyPushChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PUSH_CHANGED_EVENT));
}

/** Subscribe (reusing an existing subscription if present) and persist it. */
export async function subscribeToPush() {
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID!),
    }));
  const json = sub.toJSON();
  await savePushSubscription({
    endpoint: sub.endpoint,
    p256dh: json.keys!.p256dh,
    auth: json.keys!.auth,
  });
  notifyPushChanged();
  return sub;
}
