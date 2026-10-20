import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist/netlify");
const data = JSON.parse(await readFile(path.join(root, "src/data/site-data.json"), "utf8"));

test("every original route retains its complete prerendered HTML", async () => {
  for (const page of data.pages) {
    const relative = page.path.slice(1);
    const sourceFile = page.path === "/" ? "index.html"
      : page.path.endsWith(".html") ? relative : `${relative}/index.html`;
    const deployedFile = page.path === "/" ? "index.html"
      : page.path.endsWith(".html") ? relative : `${relative}.html`;
    const expected = await readFile(path.join(root, "dist/client", sourceFile), "utf8");
    const actual = await readFile(path.join(output, deployedFile), "utf8");
    assert.equal(actual, expected, `Content changed for ${page.path}`);
    assert.ok(actual.includes(`href="https://kazproflab.kz${page.path}"`), `Canonical missing for ${page.path}`);
    if (page.path !== "/" && !page.path.endsWith(".html")) {
      await assert.rejects(access(path.join(output, relative, "index.html")),
        { code: "ENOENT" }, `Directory would redirect ${page.path} to a trailing slash`);
    }
  }
});

test("all images, fonts, icons and client assets remain byte-identical", async () => {
  async function check(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await check(path.join(directory, entry.name), relative);
      else if (!relative.endsWith(".html") && relative !== ".htaccess") {
        const expected = await readFile(path.join(root, "dist/client", relative));
        const actual = await readFile(path.join(output, relative));
        assert.deepEqual(actual, expected, `Asset changed or missing: ${relative}`);
      }
    }
  }
  await check(path.join(root, "dist/client"));
});

test("unknown URLs have a standalone 404, with no SPA catch-all", async () => {
  const notFound = await readFile(path.join(output, "404.html"), "utf8");
  assert.ok(notFound.includes("Страница не найдена"));
  assert.ok(notFound.includes('name="robots" content="noindex,follow"'));
  assert.ok(!notFound.includes('<div id="root"'));
  await assert.rejects(access(path.join(output, "_redirects")), { code: "ENOENT" });
});
