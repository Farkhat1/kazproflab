#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultDirectory = path.join(projectRoot, "dist", "client");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
};

function isWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export async function startStaticServer({
  port = 4174,
  host = "127.0.0.1",
  directory = defaultDirectory,
  noindex = process.env.PREVIEW_NOINDEX !== "0",
} = {}) {
  const root = await realpath(directory);
  await access(path.join(root, "index.html"));
  const server = createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Cache-Control", "no-cache");
    // A preview is not a second public copy of the production website.
    if (noindex) response.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
      return;
    }
    const sendFile = async (filename, statusCode = 200) => {
      const resolved = await realpath(filename);
      if (!isWithin(root, resolved)) {
        const error = new Error("File is outside the static directory.");
        error.code = "EACCES";
        throw error;
      }
      const info = await stat(resolved);
      if (!info.isFile()) {
        const error = new Error("Not a file.");
        error.code = "ENOENT";
        throw error;
      }
      response.writeHead(statusCode, {
        "Content-Type": mimeTypes[path.extname(resolved).toLowerCase()] || "application/octet-stream",
        "Content-Length": info.size,
      });
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      const stream = createReadStream(resolved);
      stream.on("error", () => response.destroy());
      response.on("close", () => stream.destroy());
      stream.pipe(response);
    };
    const sendNotFound = async () => {
      try {
        await sendFile(path.join(root, "404.html"), 404);
      } catch {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(request.method === "HEAD" ? "" : "Not found");
      }
    };
    try {
      const requestUrl = new URL(request.url, "http://static-preview.local");
      let pathname;
      try {
        pathname = decodeURIComponent(requestUrl.pathname);
      } catch {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Invalid URL encoding");
        return;
      }
      if (
        !pathname.startsWith("/") ||
        /[\\\0]/.test(pathname) ||
        pathname.split("/").some((part) => part === ".." || part.startsWith("."))
      ) {
        await sendNotFound();
        return;
      }
      let target = path.resolve(root, `.${pathname}`);
      if (!isWithin(root, target)) {
        await sendNotFound();
        return;
      }
      const info = await stat(target).catch(() => null);
      if (info?.isDirectory()) {
        const indexPath = path.join(target, "index.html");
        await access(indexPath);
        // Mirror the original source URLs, retaining any query parameters.
        if (pathname !== "/" && pathname.endsWith("/")) {
          response.writeHead(301, { Location: pathname.replace(/\/+$/, "") + requestUrl.search });
          response.end();
          return;
        }
        target = indexPath;
      }
      await sendFile(target);
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      if (["ENOENT", "ENOTDIR", "EACCES"].includes(error.code)) {
        await sendNotFound();
      } else {
        console.error("Static preview request failed:", error.message);
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Internal server error");
      }
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  return server;
}

function readArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--port") {
      const value = Number(args[++index]);
      if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error("--port must be 1–65535.");
      options.port = value;
    } else if (argument === "--host") {
      const value = args[++index];
      if (!value || value.startsWith("-")) throw new Error("--host requires a hostname or IP.");
      options.host = value;
    } else {
      throw new Error(`Unknown argument: ${argument}. Supported: --port 4174 --host 127.0.0.1`);
    }
  }
  return options;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const options = readArguments(process.argv.slice(2));
    const server = await startStaticServer(options);
    const address = server.address();
    console.log(`Static preview: http://${options.host || "127.0.0.1"}:${address.port}`);
    console.log(`Serving ${defaultDirectory} with original routes and real 404 responses.`);
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.once(signal, () => server.close(() => process.exit(0)));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
