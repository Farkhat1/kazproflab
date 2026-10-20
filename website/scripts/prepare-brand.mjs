import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const input = path.resolve(root, "../content-assets/brand/kazproflab-original.png");
const destination = path.join(root, "public/assets/brand");
await mkdir(destination, { recursive: true });
const metadata = await sharp(input).metadata();
await sharp(input).resize({ width: 256, withoutEnlargement: true }).webp({ lossless: true })
  .toFile(path.join(destination, "kazproflab-logo.webp"));
await writeFile(path.resolve(root, "../content-assets/brand/source.json"), JSON.stringify({
  sourceUrl: "https://images.satu.kz/239575480_too-kazprof-lab.jpg",
  sourceWebsite: "https://kazproflab.kz/",
  usage: "Original brand mark, preserved without redrawing or recoloring.",
  fetchedAt: new Date().toISOString(),
  sourceFormat: metadata.format,
  width: metadata.width,
  height: metadata.height,
  hasAlpha: metadata.hasAlpha,
}, null, 2));
console.log(JSON.stringify({ format: metadata.format, width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha }));
