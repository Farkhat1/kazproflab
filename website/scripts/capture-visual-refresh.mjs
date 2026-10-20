import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const phase = process.argv.includes("--before") ? "before" : "after";
const qa = path.join(root, "qa/visual-v2", phase);
const base = process.env.BASE_URL || "http://127.0.0.1:4173";
await mkdir(qa, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [1536, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(qa, `home-${width}.png`) });
    for (const [name, selector] of [["intro", ".intro-section"], ["footer", ".site-footer"]]) {
      await page.locator(selector).screenshot({ path: path.join(qa, `${name}-${width}.png`) });
    }
    if (width === 1536) {
      await page.locator(".site-header .brand").screenshot({ path: path.join(qa, "brand.png") });
    }
  }
  console.log(JSON.stringify({ phase, errors }));
  if (phase === "after") {
    const sections = ["home-1536", "intro-1536", "footer-1536"].map(name => ({
      name,
      source: path.join(root, "qa/visual-v2/before", `${name}.png`),
      implementation: path.join(qa, `${name}.png`),
      label: "До",
    }));
    sections.push({
      name: "selected-concept",
      source: path.resolve(root, "../output/design-concepts-round-3/03-technological.png"),
      implementation: path.join(qa, "home-1536.png"),
      label: "Выбранное направление",
    });
    await page.setViewportSize({ width: 1536, height: 1024 });
    for (const { name, source, implementation, label } of sections) {
      const before = await readFile(source);
      const after = await readFile(implementation);
      await page.setContent(`<html><body style="margin:0;background:#e1e6e8;font:16px Arial"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><p style="padding:0 16px">${label}</p><img style="display:block;width:100%" src="data:image/png;base64,${before.toString("base64")}"></div><div><p style="padding:0 16px">После</p><img style="display:block;width:100%" src="data:image/png;base64,${after.toString("base64")}"></div></div></body></html>`);
      await page.locator("body > div").screenshot({ path: path.join(root, "qa/visual-v2", `${name}-comparison.png`) });
    }
  }
} finally { await browser.close(); }
