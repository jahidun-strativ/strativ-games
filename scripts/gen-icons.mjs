// One-off PWA icon generator: renders public/icons/icon.svg to the PNG sizes
// referenced by src/app/manifest.ts. Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../public/icons/icon.svg", import.meta.url));

for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
}

// Maskable: pad the artwork into the 80% safe zone on the dark app background.
const inner = await sharp(svg).resize(410, 410).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#0a0e15" },
})
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile("public/icons/icon-maskable-512.png");

// Apple touch icon (iOS home screen): the wordmark flattened on the dark bg.
await sharp(svg)
  .resize(180, 180)
  .flatten({ background: "#0a0e15" })
  .png()
  .toFile("src/app/apple-icon.png");

// Notification icon (push tray): rendered from the FAVICON source so the tray
// icon matches the browser tab, and the "SG" monogram stays legible at the
// small sizes notifications use — unlike the full wordmark.
const favicon = await readFile(new URL("../src/app/icon.svg", import.meta.url));
for (const size of [96, 192]) {
  await sharp(favicon)
    .resize(size, size)
    .png()
    .toFile(`public/icons/notification-${size}.png`);
}

console.log("Icons written to public/icons/ and src/app/apple-icon.png");
