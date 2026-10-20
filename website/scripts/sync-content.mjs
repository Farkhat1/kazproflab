import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.resolve(root, "../content-source");
const destination = path.join(root, "public/assets/imported");
await mkdir(destination, { recursive: true });
await mkdir(path.join(root, "src/data"), { recursive: true });
let data = await readFile(path.join(source, "site-data.json"), "utf8");
let totalBytes = 0;
for (const file of await readdir(path.join(source, "assets"))) {
  const target = `${path.parse(file).name}.webp`;
  const result = await sharp(path.join(source, "assets", file))
    .rotate().resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 84 }).toFile(path.join(destination, target));
  totalBytes += result.size;
  data = data.replaceAll(`/assets/imported/${file}`, `/assets/imported/${target}`);
}
await writeFile(path.join(root, "src/data/site-data.json"), data);
await writeFile(path.join(root, "src/data/home-content.json"), await readFile(path.join(source, "home-content.json")));
await sharp(path.resolve(root, "../content-assets/hero-laboratory.png"))
  .webp({ quality: 88 }).toFile(path.join(root, "public/assets/hero-laboratory.webp"));
console.log(`Content synced. Imported images: ${(totalBytes / 1024 / 1024).toFixed(1)} MB.`);
