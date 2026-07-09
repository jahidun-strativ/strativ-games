import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Strativ Games",
    short_name: "Strativ Games",
    description:
      "Manage sports, teams, players, staff, venues, fixtures and stats for Strativ.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    orientation: "portrait-primary",
    // Bump ?v= whenever an icon file changes so the browser re-reads the
    // manifest and refreshes the installed home-screen icon (same URL = no
    // update signal). Keep in sync with the version in public/sw.js.
    icons: [
      { src: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png?v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
