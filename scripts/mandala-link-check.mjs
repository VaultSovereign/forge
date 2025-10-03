#!/usr/bin/env node
import fs from "node:fs";

const svg = fs.readFileSync("docs/VaultMesh_Mandala.svg", "utf8");

// Simple regex to extract href and xlink:href attributes
const hrefMatches = [
  ...svg.matchAll(/(?:xlink:href|href)="([^"]+)"/g)
];

const hrefs = [...new Set(hrefMatches.map(m => m[1]))].filter(href => 
  href && !href.startsWith("http") && !href.startsWith("#")
);

let ok = true;
for (const href of hrefs) {
  // Split on # to get file path without fragment
  const [filePath] = href.split("#");
  const target = `docs/${filePath}`;
  
  if (!fs.existsSync(target)) {
    console.error(`❌ Missing target: ${href} (expected: ${target})`);
    ok = false;
  } else {
    console.log(`✅ ${href}`);
  }
}

if (!ok) {
  console.error("\n❌ Some mandala links are broken. Fix them before committing.");
  process.exit(1);
}

console.log("\n✨ All mandala links are valid!");
