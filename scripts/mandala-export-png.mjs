#!/usr/bin/env node
/**
 * Mandala PNG Export via Puppeteer (no inkscape/rsvg required)
 * 
 * This script uses headless Chrome to render the SVG and capture
 * a high-resolution PNG screenshot. It's slower than native tools
 * but requires no system dependencies beyond Node.js.
 * 
 * Usage:
 *   node scripts/mandala-export-png.mjs [--width 2400] [--output docs/VaultMesh_Mandala.png]
 */

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse args
const args = process.argv.slice(2);
const width = parseInt(args.find(a => a.startsWith("--width="))?.split("=")[1] || "2400");
const output = args.find(a => a.startsWith("--output="))?.split("=")[1] || "docs/VaultMesh_Mandala.png";

const SVG_PATH = resolve(__dirname, "../docs/VaultMesh_Mandala.svg");

// Check if puppeteer is available
let puppeteer;
try {
  puppeteer = await import("puppeteer");
} catch (err) {
  console.error(`
❌ Puppeteer not found. Install it with:

   pnpm add -D puppeteer

Or use native tools:

   # Inkscape (recommended)
   inkscape docs/VaultMesh_Mandala.svg --export-type=png --export-filename=docs/VaultMesh_Mandala.png --export-dpi=220

   # rsvg-convert (librsvg)
   rsvg-convert -f png -w 2400 -o docs/VaultMesh_Mandala.png docs/VaultMesh_Mandala.svg

   # ImageMagick (if convert supports SVG)
   convert -density 300 docs/VaultMesh_Mandala.svg docs/VaultMesh_Mandala.png
`);
  process.exit(1);
}

// Read SVG and inject as data URI
const svgContent = fs.readFileSync(SVG_PATH, "utf8");
const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString("base64")}`;

console.log(`🖼️  Launching headless Chrome...`);
const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();

// Calculate viewport (1400x1400 viewBox with 16:9 padding)
const height = Math.round(width * (1400 / 1400));
await page.setViewport({ width, height, deviceScaleFactor: 2 });

// Load SVG as HTML
await page.setContent(`
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; }
    body { display: flex; align-items: center; justify-content: center; background: #0b0f14; }
    img { width: 100%; height: auto; }
  </style>
</head>
<body>
  <img src="${svgDataUri}" alt="VaultMesh Mandala">
</body>
</html>
`, { waitUntil: "networkidle0" });

console.log(`📸 Capturing PNG at ${width}x${height}...`);
await page.screenshot({ path: output, type: "png" });

await browser.close();

const stats = fs.statSync(output);
console.log(`✅ ${output} (${(stats.size / 1024).toFixed(1)}KB)`);
