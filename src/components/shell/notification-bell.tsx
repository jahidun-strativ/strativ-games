"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Badge, Button, Popover, Spin } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { PushToggle } from "@/components/pwa/push-toggle";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/server/actions/notifications";

const POLL_MS = 30_000;

const TYPE_ICON: Record<string, string> = {
  match: "⚽",
  result: "🏁",
  assignment: "👥",
  cost: "💸",
};

// "just now" / "3h ago" / "2d ago" — good enough for an inbox, no dep needed.
function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshCount = useCallback(() => {
    void getUnreadCount()
      .then(setCount)
      .catch(() => {});
  }, []);

  // Poll the unread count while the tab is visible; pause in the background.
  useEffect(() => {
    refreshCount();
    const start = () => {
      if (timer.current) return;
      timer.current = setInterval(refreshCount, POLL_MS);
    };
    const stop = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshCount();
        start();
      } else {
        stop();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCount]);

  // Opening the tray loads the list and clears the unread badge.
  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setLoading(true);
    try {
      const list = await listNotifications();
      setItems(list);
      if (list.some((n) => !n.read)) {
        await markAllNotificationsRead();
        setCount(0);
        setItems(list.map((n) => ({ ...n, read: true })));
      }
    } catch {
      message.error("Couldn't load notifications.");
    } finally {
      setLoading(false);
    }
  }

  function openItem(n: NotificationItem) {
    setOpen(false);
    if (n.url) router.push(n.url);
  }

  const content = (
    <div style={{ width: compact ? 300 : 340 }}>
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="font-display text-base text-ink-900">Notifications</span>
      </div>
      {loading && !items ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : !items || items.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-ink-500">You&apos;re all caught up.</p>
      ) : (
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => openItem(n)}
                className={`flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-cream-200 ${
                  n.url ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span className="mt-0.5 text-lg leading-none" aria-hidden>
                  {TYPE_ICON[n.type] ?? "🔔"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">{n.title}</span>
                  <span className="block text-xs text-ink-500">{n.body}</span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-ink-400">
                    {ago(n.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Device push control lives here so there's a single bell in the UI. */}
      <div className="mt-3 border-t border-line pt-3">
        <PushToggle />
      </div>
    </div>
  );

  const trigger = (
    <Badge count={count} size="small" offset={[-2, 2]}>
      <Button
        shape="circle"
        icon={<BellOutlined />}
        aria-label="Notifications"
        className="!h-9 !w-9 !min-w-9"
      />
    </Badge>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={onOpenChange}
      placement={compact ? "bottomRight" : "topRight"}
    >
      {compact ? (
        trigger
      ) : (
        // Sidebar: a full-width row that reads like the other menu controls.
        <Button block className="!flex !items-center !justify-center !gap-2">
          <Badge count={count} size="small">
            <BellOutlined />
          </Badge>
          <span>Notifications</span>
        </Button>
      )}
    </Popover>
  );
}
