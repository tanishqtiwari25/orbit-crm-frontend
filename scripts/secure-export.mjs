import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
let pages = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith(".html")) {
      let html = fs.readFileSync(file, "utf8");
      const hashes = [
        ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
      ]
        .filter((m) => !/\bsrc\s*=/i.test(m[1]))
        .map(
          (m) =>
            "'sha256-" +
            createHash("sha256").update(m[2]).digest("base64") +
            "'",
        );
      const policy =
        "default-src 'self'; script-src 'self' " +
        [...new Set(hashes)].join(" ") +
        "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests";
      html = html.replace(
        /<head>/i,
        '<head><meta http-equiv="Content-Security-Policy" content="' +
          policy +
          '">',
      );
      fs.writeFileSync(file, html);
      pages++;
    }
  }
}
walk("out");
console.log("Secured static HTML pages: " + pages);
