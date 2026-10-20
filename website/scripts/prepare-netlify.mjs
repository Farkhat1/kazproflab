import { access, copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "dist/client");
const destination = path.resolve(root, "dist/netlify");
const data = JSON.parse(await readFile(path.join(root, "src/data/site-data.json"), "utf8"));
const manifest = JSON.parse(await readFile(path.join(root, "dist/prerender-manifest.json"), "utf8"));

// Refuse to package a partial build. The normal Apache/Nginx output stays intact.
await access(path.join(source, "404.html"));
if (manifest.pageCount !== data.pages.length) throw new Error("Incomplete prerender output");

const renamedPages = new Map(data.pages
  .filter(page => page.path !== "/" && !page.path.endsWith(".html"))
  .map(page => [`${page.path.slice(1)}/index.html`, `${page.path.slice(1)}.html`]));

// Only this dedicated, reproducible build directory may be removed.
if (path.relative(path.resolve(root, "dist"), destination) !== "netlify") {
  throw new Error("Netlify output must stay inside the project's dist directory");
}
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

async function copyDirectory(directory, prefix = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await copyDirectory(path.join(directory, entry.name), relative);
    } else if (entry.isFile() && relative !== ".htaccess") {
      // With Pretty URLs disabled, Netlify serves /contacts from contacts.html
      // without its automatic directory redirect to /contacts/.
      const target = path.join(destination, renamedPages.get(relative) || relative);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(path.join(directory, entry.name), target);
    }
  }
}

await copyDirectory(source);
console.log(`Prepared Netlify output for ${data.pages.length} original routes in dist/netlify.`);
