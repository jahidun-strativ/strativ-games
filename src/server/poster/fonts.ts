// Fonts for the match-poster image generator. Satori (behind next/og) needs the
// raw font bytes for every weight it renders, so we fetch the two brand faces —
// Oswald (condensed display / headings) and Archivo (body) — from Google Fonts
// at request time and cache the bytes in module scope for the life of the server.
//
// URLs are resolved live via the Google Fonts CSS API (the direct gstatic file
// URLs rotate between font versions, so hard-coding them breaks over time).
// Requesting the CSS with an old User-Agent makes Google return TTF URLs, which
// Satori parses fastest. Each face loads independently: one failure only drops
// that weight, and if everything fails we return [] and ImageResponse falls back
// to its built-in font — the poster still renders.

type FontSpec = { name: string; weight: 400 | 500 | 600 | 700 };

const SPECS: FontSpec[] = [
  { name: "Oswald", weight: 500 },
  { name: "Oswald", weight: 700 },
  { name: "Archivo", weight: 400 },
  { name: "Archivo", weight: 600 },
];

export type LoadedFont = {
  name: string;
  data: ArrayBuffer;
  weight: FontSpec["weight"];
  style: "normal";
};

// A very old UA makes Google Fonts serve a single static TTF (`format('truetype')`)
// instead of subsetted woff2 — Satori needs TTF/OTF/WOFF, and TTF parses fastest.
const OLD_UA = "Mozilla/4.0";

async function loadOne(spec: FontSpec): Promise<LoadedFont | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      spec.name,
    )}:wght@${spec.weight}`;
    const css = await (await fetch(cssUrl, { headers: { "User-Agent": OLD_UA } })).text();
    const match = css.match(/src:\s*url\((https:[^)]+\.(?:ttf|otf))\)/);
    if (!match) throw new Error(`no ttf url in css for ${spec.name} ${spec.weight}`);
    const res = await fetch(match[1]);
    if (!res.ok) throw new Error(`font file ${spec.name} ${spec.weight}: ${res.status}`);
    return { name: spec.name, data: await res.arrayBuffer(), weight: spec.weight, style: "normal" };
  } catch (err) {
    console.error(`[poster] font load failed (${spec.name} ${spec.weight}):`, err);
    return null;
  }
}

let cache: LoadedFont[] | null = null;

export async function loadPosterFonts(): Promise<LoadedFont[]> {
  if (cache?.length) return cache;
  const loaded = (await Promise.all(SPECS.map(loadOne))).filter((f): f is LoadedFont => f !== null);
  if (loaded.length) cache = loaded;
  return loaded;
}
