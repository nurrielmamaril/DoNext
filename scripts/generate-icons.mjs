import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const outDir = fileURLToPath(new URL("../public/icons/", import.meta.url));
mkdirSync(outDir, { recursive: true });

function svgFor(size, padding) {
  const inner = size - padding * 2;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#0a0a0a"/>
      <text
        x="50%" y="50%"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif"
        font-weight="800"
        font-size="${inner * 0.55}"
        fill="#ffffff"
      >D</text>
    </svg>
  `;
}

const targets = [
  { name: "icon-192.png", size: 192, padding: 0 },
  { name: "icon-512.png", size: 512, padding: 0 },
  // Maskable icons need extra padding so the OS's mask shape doesn't clip the glyph.
  { name: "icon-maskable-512.png", size: 512, padding: 64 },
];

for (const { name, size, padding } of targets) {
  const svg = Buffer.from(svgFor(size, padding));
  await sharp(svg).png().toFile(path.join(outDir, name));
  console.log(`Wrote ${name}`);
}
