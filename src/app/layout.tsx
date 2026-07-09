import type { Metadata, Viewport } from "next";
import { Archivo, Chivo_Mono, Space_Grotesk } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AntdProvider } from "@/components/antd-provider";
import { Providers } from "@/components/providers";
import { SWRegister } from "@/components/pwa/sw-register";
import "./globals.css";

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const chivoMono = Chivo_Mono({
  variable: "--font-chivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Strativ Games",
    template: "%s · Strativ Games",
  },
  description:
    "Manage sports, teams, players, staff, venues, fixtures and stats for Strativ.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Strativ Games",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${grotesk.variable} ${archivo.variable} ${chivoMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <AntdRegistry>
          <AntdProvider>
            <Providers>{children}</Providers>
          </AntdProvider>
        </AntdRegistry>
        <SWRegister />
      </body>
    </html>
  );
}
