import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 4173);
const basePath = "/ai-team-sdlc-sample-focus-garden/";
const root = resolve("dist");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json",
};

function sendFile(path, response) {
  response.statusCode = 200;
  response.setHeader(
    "Content-Type",
    mimeTypes[extname(path)] ?? "application/octet-stream",
  );
  if (path.endsWith("sw.js")) response.setHeader("Cache-Control", "no-cache");
  createReadStream(path).pipe(response);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  if (url.pathname === "/") {
    response.writeHead(302, { Location: basePath });
    response.end();
    return;
  }
  if (url.pathname === `${basePath}update-sw.js`) {
    response.setHeader("Content-Type", "text/javascript; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Service-Worker-Allowed", basePath);
    response.end(
      'self.addEventListener("message",event=>{if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting()});self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));',
    );
    return;
  }
  if (!url.pathname.startsWith(basePath)) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  const relative = normalize(
    decodeURIComponent(url.pathname.slice(basePath.length)),
  );
  const candidate = join(root, relative);
  if (
    !candidate.startsWith(root) ||
    relative.startsWith("..") ||
    relative.includes("\0")
  ) {
    response.statusCode = 400;
    response.end("Invalid path");
    return;
  }
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    sendFile(candidate, response);
    return;
  }
  if (!extname(relative)) {
    sendFile(join(root, "index.html"), response);
    return;
  }
  response.statusCode = 404;
  response.end("Not found");
});

server.listen(port, host, () => {
  console.log(`Exact-base preview: http://${host}:${port}${basePath}`);
});
