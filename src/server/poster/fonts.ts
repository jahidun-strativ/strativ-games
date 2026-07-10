// Fonts for the match-poster image generator. Satori (behind next/og) needs the
// raw font bytes for every weight it renders, so we fetch the two brand faces —
// Oswald (condensed display / headings) and Archivo (body) — from Google Fonts
// at request time and cache the bytes in module scope for the life of the server.
//
// If the fetch fails (offline / blocked), we return an empty font list and the
// ImageResponse falls back to its built-in font. The poster still renders.

type FontSpec = { name: string; weight: 400 | 500 | 600 | 700; url: string };

// Google Fonts static TTF endpoints (stable, no CSS round-trip needed).
const SPECS: FontSpec[] = [
  {
    name: "Oswald",
    weight: 500,
    url: "https://fonts.gstatic.com/s/oswald/v53/TK3iWkUHHAIjg752GT8G.ttf",
  },
  {
    name: "Oswald",
    weight: 700,
    url: "https://fonts.gstatic.com/s/oswald/v53/TK3iWkUHHAIjg752Ep8G.ttf",
  },
  {
    name: "Archivo",
    weight: 400,
    url: "https://fonts.gstatic.com/s/archivo/v19/k3k6o8UDI-1M0wlSfdzyIEko0AXoUAyDaA.ttf",
  },
  {
    name: "Archivo",
    weight: 600,
    url: "https://fonts.gstatic.com/s/archivo/v19/k3k6o8UDI-1M0wlSfdzyIEko0AWCUgyDaA.ttf",
  },
];

export type LoadedFont = {
  name: string;
  data: ArrayBuffer;
  weight: FontSpec["weight"];
  style: "normal";
};

let cache: LoadedFont[] | null = null;

export async function loadPosterFonts(): Promise<LoadedFont[]> {
  if (cache) return cache;
  try {
    const fonts = await Promise.all(
      SPECS.map(async (spec) => {
        const res = await fetch(spec.url, {
          headers: { "User-Agent": "Mozilla/5.0 (Strativ Games poster)" },
        });
        if (!res.ok) throw new Error(`font ${spec.name} ${spec.weight}: ${res.status}`);
        const data = await res.arrayBuffer();
        return { name: spec.name, data, weight: spec.weight, style: "normal" as const };
      }),
    );
    cache = fonts;
    return fonts;
  } catch (err) {
    console.error("[poster] font load failed, using fallback font:", err);
    return [];
  }
}
