// serve.js — zero-dependency static server for the Atlas app.
// Run:  node serve.js   then open  http://localhost:5174
// With --open, launches the browser once the server is listening (used by
// StartAtlas.cmd — opening the browser first races the server, and the
// service worker turns that race into broken flag icons).

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ROOT_DIRECTORY = __dirname;
const PORT = 5174;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((request, response) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }
  if (urlPath.endsWith("/")) urlPath += "index.html";

  const filePath = path.normalize(path.join(ROOT_DIRECTORY, urlPath));
  if (!filePath.startsWith(ROOT_DIRECTORY)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, fileContents) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found: " + urlPath);
      return;
    }
    const mimeType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": mimeType, "Cache-Control": "no-cache" });
    response.end(fileContents);
  });
});

const shouldOpenBrowser = process.argv.includes("--open");

function openBrowser() {
  exec(`start "" http://localhost:${PORT}/`);
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.log(`Atlas is already running at  http://localhost:${PORT}`);
    if (shouldOpenBrowser) openBrowser();
    return;
  }
  throw error;
});

server.listen(PORT, () => {
  console.log(`Atlas running at  http://localhost:${PORT}`);
  if (shouldOpenBrowser) openBrowser();
});
