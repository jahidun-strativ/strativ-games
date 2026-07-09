// One-off PWA icon generator: renders public/icons/icon.svg to the PNG sizes
// referenced by src/app/manifest.ts. Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../public/icons/icon.svg", import.meta.url));

for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
}

// Maskable: pad the artwork into the 80% safe zone on a cream background.
const inner = await sharp(svg).resize(410, 410).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#faf3e3" },
})
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile("public/icons/icon-maskable-512.png");

console.log("Icons written to public/icons/");
