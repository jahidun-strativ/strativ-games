"use client";

import { App, ConfigProvider, theme as antdTheme } from "antd";

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: "#f97316",
          colorInfo: "#38bdf8",
          colorSuccess: "#22c55e",
          colorWarning: "#facc15",
          colorError: "#ef4444",
          colorText: "#f1f5f9",
          colorTextSecondary: "#94a3b8",
          colorLink: "#fb923c",
          colorLinkHover: "#fdba74",
          colorLinkActive: "#f97316",
          colorBgBase: "#0b1220",
          colorBgContainer: "#16202f",
          colorBgElevated: "#1b2739",
          colorBorder: "rgba(255, 255, 255, 0.16)",
          colorBorderSecondary: "rgba(255, 255, 255, 0.1)",
          colorBgLayout: "#0b1220",
          borderRadius: 10,
          fontFamily: "var(--font-archivo), Archivo, system-ui, sans-serif",
          controlHeight: 38,
        },
        components: {
          Button: {
            fontWeight: 600,
            primaryShadow: "0 4px 18px rgba(249, 115, 22, 0.4)",
          },
          Table: {
            headerBg: "rgba(255, 255, 255, 0.04)",
            headerColor: "#94a3b8",
            colorBgContainer: "transparent",
            cellPaddingBlock: 12,
          },
          Tag: { fontSizeSM: 11 },
        },
      }}
    >
      <App className="contents">{children}</App>
    </ConfigProvider>
  );
}
