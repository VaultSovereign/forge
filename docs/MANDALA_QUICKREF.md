# 🌀 VaultMesh Mandala — Quick Reference

## What It Is

The **VaultMesh Mandala** is an interactive SVG diagram showing the Five Pillars of the Polis. It combines:
- Sacred geometry (golden ratio rings)
- Clickable navigation (6 links to documentation)
- Live animations (pulsing arcs)
- Auto-stamped Merkle roots
- Light/dark theme support

## Quick Commands

```bash
# Validate all links (CI-ready)
make mandala-link-check

# Stamp latest Merkle root
make mandala-stamp

# Export PNG for presentations
make mandala-png

# Open in browser
make mandala-open
```

## File Locations

| File | Purpose |
|------|---------|
| `docs/VaultMesh_Mandala.svg` | The interactive mandala (234 lines) |
| `scripts/mandala-stamp-root.mjs` | Auto-stamps Merkle roots |
| `scripts/mandala-link-check.mjs` | Validates link integrity |
| `docs/MANDALA.md` | Complete visual guide |

## Clickable Elements

1. **Deployment** (jade) → `DEPLOY_GCP.md`
2. **Guardian** (indigo) → `RECEIPTS.md`
3. **Alerting** (amber) → `GUARDIAN_ALERTING.md`
4. **Covenant** (coral) → `CIVILIZATION_COVENANT.md`
5. **Evolution** (violet) → `CIVILIZATION_COVENANT.md#vi-nigredo--albedo--rubedo`
6. **Merkle Tree** (amber) → `RECEIPTS.md#merkle-rollup`

## Interactive Features

✅ **Hover effects**: Pillar nodes glow, arcs speed up  
✅ **Animations**: 6-second pulse cycle on flow arcs  
✅ **Themes**: Auto-detects light/dark system preference  
✅ **Accessibility**: ARIA labels, 4.5:1+ contrast, keyboard nav  
✅ **CI integration**: Link validation fails build on broken links  

## GitHub Rendering Note

⚠️ When embedded as `<img>` in GitHub markdown, links are sanitized and non-functional. Always provide a direct link:

```markdown
![VaultMesh Mandala](docs/VaultMesh_Mandala.svg)

**Open interactive:** [docs/VaultMesh_Mandala.svg](docs/VaultMesh_Mandala.svg)
```

This pattern is documented in README and MANDALA.md.

## CI Integration

Add to your workflow after Merkle rollup:

```yaml
- name: Stamp mandala with latest root
  run: make mandala-stamp

- name: Validate mandala links
  run: make mandala-link-check
```

## Customization

Edit CSS variables at the top of `VaultMesh_Mandala.svg`:

```css
:root {
  --accent1: #7bdcb5;  /* Deployment (jade) */
  --accent2: #7aa2f7;  /* Guardian (indigo) */
  --accent3: #f7c948;  /* Alerting (amber) */
  --accent4: #f47c7c;  /* Covenant (coral) */
  --accent5: #a78bfa;  /* Evolution (violet) */
}
```

## Philosophy

The mandala embodies the **hermetic principle** of VaultMesh:
- **As above, so below**: Pillars mirror the core's sovereignty
- **Golden ratio**: Natural harmony (φ = 1.618...)
- **Five elements**: Earth, water, fire, air, spirit

It is both a **technical diagram** and a **sacred symbol**—a visual covenant binding the Polis.

---

**Steel sung. The mandala guides.** ⚔️
