# 🌀 VaultMesh Mandala — Visual Guide

![VaultMesh Mandala](VaultMesh_Mandala.svg)

**Open interactive:** [VaultMesh_Mandala.svg](VaultMesh_Mandala.svg) — Click any pillar to jump to its Sacred Text

---

## Overview

The mandala is a **clickable, golden-ratio sacred geometry** diagram representing the Five Pillars of the Polis. It features:

✨ **6 interactive links** to documentation  
🎨 **Light/dark theme** auto-detection  
🌊 **Animated flows** between pillars  
✅ **CI-validated** link integrity  
🔄 **Auto-stamped** Merkle roots  

---

## Structure

### Golden Ratio Rings
- **Outer ring (R = 520px)**: Pillar positions
- **Middle ring (R/φ ≈ 321px)**: Flow arcs  
- **Inner ring (R/φ² ≈ 199px)**: Core capabilities

### Polis Core (Center)
The sovereign heart of VaultMesh:
- **Boxes • CRDT • Treasury**: Identity and state management
- **Receipts • Merkle • Proofs**: Cryptographic audit trail

### The Five Pillars

| Pillar | Color | Position | Links to |
|--------|-------|----------|----------|
| **Deployment** | Jade (#7bdcb5) | North | [DEPLOY_GCP.md](DEPLOY_GCP.md) |
| **Guardian** | Indigo (#7aa2f7) | Northeast | [RECEIPTS.md](RECEIPTS.md) |
| **Alerting** | Amber (#f7c948) | Southeast | [GUARDIAN_ALERTING.md](GUARDIAN_ALERTING.md) |
| **Covenant** | Coral (#f47c7c) | Southwest | [CIVILIZATION_COVENANT.md](CIVILIZATION_COVENANT.md) |
| **Evolution** | Violet (#a78bfa) | Northwest | [Alchemical phases](CIVILIZATION_COVENANT.md#vi-nigredo--albedo--rubedo) |
| **Merkle Tree** | Amber | South | [Merkle rollup](RECEIPTS.md#merkle-rollup) |

### Visual Elements

- **Arcs**: Energy flows between pillars (animated pulse)
- **Arrows**: Data pipelines to core
- **Receipt dots**: Guardian drill artifacts
- **Merkle tree**: Daily root computation (clickable)

## Customization

Edit the mandala by modifying the CSS variables at the top of `VaultMesh_Mandala.svg`:

```css
:root {
  --bg: #0b0f14;           /* background */
  --fg: #e6edf3;           /* foreground text */
  --accent1: #7bdcb5;      /* Deployment (jade) */
  --accent2: #7aa2f7;      /* Guardian (indigo) */
  --accent3: #f7c948;      /* Alerting (amber) */
  --accent4: #f47c7c;      /* Covenant (coral) */
  --accent5: #a78bfa;      /* Evolution (violet) */
}
```

## Accessibility

- **ARIA labels**: Full `<title>` and `<desc>` for screen readers
- **High contrast**: 4.5:1+ contrast ratio on all text
- **Semantic structure**: Grouped `<g id="pillar-...">` elements with clickable links
- **Keyboard navigable**: Tab through pillar links with standard keyboard navigation
- **Hover affordance**: Glowing effect on pillar nodes when hovering

---

## Interactive Features

### ✅ Clickable Pillars (IMPLEMENTED)
All five pillars and the Merkle tree are now clickable links:

```xml
<a xlink:href="DEPLOY_GCP.md" href="DEPLOY_GCP.md" target="_top">
  <g id="pillar-deployment" transform="translate(0,-400)">
    <!-- pillar content -->
  </g>
</a>
```

Both `xlink:href` (SVG 1.1) and `href` (SVG 2.0) are set for maximum compatibility.

### ✅ Auto-Stamped Merkle Root (IMPLEMENTED)
The footer displays the latest Merkle root from nightly rollups:

```bash
# Stamp the mandala with today's root
make mandala-stamp

# Or manually:
node scripts/mandala-stamp-root.mjs
```

The script reads `ai-companion-proxy-starter/artifacts/roots/root-YYYY-MM-DD.json` and updates the footer text.

### ✅ Light/Dark Theme (IMPLEMENTED)
Auto-detects system preference via CSS media query:

```css
@media (prefers-color-scheme: light) {
  :root {
    --bg: #f8fafc;
    --fg: #0b1020;
    --grid: rgba(0,0,0,0.08);
  }
}
```

### ✅ Animated Flows (IMPLEMENTED)
Arc paths pulse gently, speeding up on hover:

```css
@keyframes pulse { 0%{opacity:.35} 50%{opacity:.75} 100%{opacity:.35} }
#flows .arc { animation: pulse 6s ease-in-out infinite; }
#flows .arc:hover { opacity: 1; animation-duration: 2.5s; }
```

---

## Makefile Targets

### Essential Commands

```bash
# Validate all mandala links (fails CI if broken)
make mandala-link-check

# Stamp latest Merkle root into footer
make mandala-stamp

# Export high-res PNG (requires inkscape or rsvg-convert)
make mandala-png

# Export optimized WebP (requires cwebp)
make mandala-webp

# Open in browser
make mandala-open
```

### CI Integration

Add to your nightly Merkle rollup workflow:

```bash
# After generating roots
make mandala-stamp
git add docs/VaultMesh_Mandala.svg
git commit -m "chore(docs): Update mandala Merkle root"
```

Add link validation to CI:

```yaml
- name: Validate mandala links
  run: make mandala-link-check
```

---

## Usage in Documentation

### Markdown (GitHub, GitBook)
```markdown
![VaultMesh Mandala](docs/VaultMesh_Mandala.svg)

**Open interactive:** [docs/VaultMesh_Mandala.svg](docs/VaultMesh_Mandala.svg)
```

⚠️ **Note:** GitHub sanitizes `<img>` tags and blocks interactivity. Always provide a direct link for clickable access.

### HTML (Your Docs Site)
```html
<!-- Interactive SVG (recommended) -->
<object data="docs/VaultMesh_Mandala.svg" type="image/svg+xml" width="600">
  VaultMesh Mandala
</object>

<!-- Fallback for non-interactive contexts -->
<img src="docs/VaultMesh_Mandala.svg" alt="VaultMesh Mandala" width="600">
```

### Presentations
Export high-res PNG or WebP:

```bash
# PNG at 220 DPI (recommended for slides)
make mandala-png

# WebP for web performance
make mandala-png && make mandala-webp
```

---

## Testing the Mandala

### Local Testing

```bash
# Open in browser (interactive links work)
make mandala-open

# Validate all links
make mandala-link-check

# Stamp with latest root (if available)
make mandala-stamp
```

### Expected Behavior

✅ **In browser:** All 6 elements are clickable (5 pillars + Merkle tree)  
✅ **On hover:** Pillar nodes glow, arcs pulse faster  
✅ **Theme:** Auto-switches based on system preference  
✅ **Footer:** Shows latest Merkle root after `make mandala-stamp`

---

## Philosophy

The mandala reflects the **hermetic principle** of VaultMesh:
- **As above, so below**: Each pillar mirrors the core's sovereignty
- **Golden ratio**: Natural harmony in structure
- **Five elements**: Deployment (earth), Guardian (water), Alerting (fire), Covenant (air), Evolution (spirit)

It is both a **technical diagram** and a **sacred symbol**—a visual covenant binding the Polis.

---

**Next Steps:**
- View the covenant: [CIVILIZATION_COVENANT.md](CIVILIZATION_COVENANT.md)
- Explore operations: [OPERATIONS.md](../ai-companion-proxy-starter/OPERATIONS.md)
- Study receipts: [RECEIPTS.md](RECEIPTS.md)
