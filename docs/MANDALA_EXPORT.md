# 📸 VaultMesh Mandala — PNG Export Guide

The interactive SVG is perfect for web use, but you may need a static PNG for:
- 📊 Presentation slides (PowerPoint, Keynote, Google Slides)
- 🐦 Social media (Twitter, LinkedIn)
- 📄 PDF documents
- 🖼️ High-res prints

## Quick Export Methods

### Option 1: Inkscape (Recommended)

Best quality, precise DPI control:

```bash
# Install inkscape
sudo apt install inkscape  # Debian/Ubuntu
brew install inkscape      # macOS

# Export at 220 DPI (presentation quality)
make mandala-png

# Or manually:
inkscape docs/VaultMesh_Mandala.svg \
  --export-type=png \
  --export-filename=docs/VaultMesh_Mandala.png \
  --export-dpi=220
```

**Result:** ~300KB PNG at 2200×2200px

### Option 2: rsvg-convert (Fast)

Good quality, simple command:

```bash
# Install librsvg
sudo apt install librsvg2-bin  # Debian/Ubuntu
brew install librsvg           # macOS

# Export at 2400px width
rsvg-convert -f png -w 2400 \
  -o docs/VaultMesh_Mandala.png \
  docs/VaultMesh_Mandala.svg
```

**Result:** ~250KB PNG at 2400×2400px

### Option 3: ImageMagick

Fallback option (quality varies):

```bash
# Install ImageMagick with SVG support
sudo apt install imagemagick librsvg2-bin  # Debian/Ubuntu
brew install imagemagick librsvg           # macOS

# Export at 300 DPI
convert -density 300 \
  docs/VaultMesh_Mandala.svg \
  docs/VaultMesh_Mandala.png
```

**Result:** Size depends on ImageMagick version and SVG delegate

### Option 4: Browser Screenshot (Manual)

For environments without CLI tools:

1. Open `docs/VaultMesh_Mandala.svg` in Chrome/Firefox
2. Press **F12** to open DevTools
3. Run in console:
   ```javascript
   document.body.style.margin = '0';
   document.body.style.background = '#0b0f14';
   document.querySelector('svg').style.width = '100vw';
   document.querySelector('svg').style.height = '100vh';
   ```
4. Press **Ctrl+Shift+P** (Cmd+Shift+P on macOS)
5. Type "screenshot" → Select **"Capture full size screenshot"**
6. Save as `VaultMesh_Mandala.png`

**Result:** Variable size, depends on browser window

### Option 5: Puppeteer (Node.js)

For CI/CD environments without system dependencies:

```bash
# Install puppeteer (adds ~300MB Chromium)
pnpm add -D puppeteer

# Export via headless Chrome
node scripts/mandala-export-png.mjs --width=2400
```

**Result:** ~200KB PNG at 2400×2400px

## Recommended Sizes

| Use Case | Width | DPI | Command |
|----------|-------|-----|---------|
| **Slides** | 2200px | 220 | `inkscape ... --export-dpi=220` |
| **Social Media** | 1600px | 144 | `rsvg-convert -w 1600` |
| **Print (8×8")** | 2400px | 300 | `inkscape ... --export-dpi=300` |
| **Web Thumbnail** | 600px | 72 | `rsvg-convert -w 600` |

## WebP Export (Smaller File Size)

After generating PNG, convert to WebP for 30-50% size reduction:

```bash
# Install cwebp
sudo apt install webp  # Debian/Ubuntu
brew install webp      # macOS

# Convert with high quality
make mandala-webp

# Or manually:
cwebp -q 92 docs/VaultMesh_Mandala.png -o docs/VaultMesh_Mandala.webp
```

**Result:** ~100KB WebP (vs ~250KB PNG)

## Committing Static Exports

⚠️ **Generally avoid** committing PNGs to git repos (binary bloat).

**Better approach:**
1. Generate PNG/WebP in CI/CD
2. Upload to artifacts or CDN
3. Link from README: `![Mandala](https://cdn.example.com/mandala.png)`

**Exception:** If you want one canonical high-res export in the repo:

```bash
# Generate once
make mandala-png

# Add to git
git add docs/VaultMesh_Mandala.png
git commit -m "docs: Add static Mandala export for presentations"

# Document in README:
# Download: [VaultMesh_Mandala.png](docs/VaultMesh_Mandala.png) (2200×2200, 300KB)
```

## Quality Comparison

| Tool | Quality | Speed | Size | Notes |
|------|---------|-------|------|-------|
| Inkscape | ⭐⭐⭐⭐⭐ | Slow | ~300KB | Best text rendering |
| rsvg-convert | ⭐⭐⭐⭐ | Fast | ~250KB | Good balance |
| ImageMagick | ⭐⭐⭐ | Fast | Varies | Depends on delegate |
| Puppeteer | ⭐⭐⭐⭐ | Slow | ~200KB | CI-friendly |
| Browser | ⭐⭐⭐ | Manual | Varies | Quick testing |

---

**Recommendation:** Use **Inkscape** for final presentation exports, **rsvg-convert** for quick iterations, and **Puppeteer** for automated CI builds.

Steel sung. The Mandala travels beyond the forge. ⚔️
