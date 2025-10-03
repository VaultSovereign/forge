# 🔄 VaultMesh Mandala — CI Integration Guide

This document shows how to wire the Mandala into your CI/CD pipelines for automatic stamping, validation, and export.

## Quick Integration

Add these steps to your workflows to keep the Mandala fresh and verified.

---

## 1. Nightly Auto-Stamp (Merkle Root)

**When:** After your nightly Merkle rollup completes  
**Why:** Keeps the Mandala footer in sync with today's root  
**Cost:** ~1s execution time

### GitHub Actions

Add to `.github/workflows/nightly-rollup.yml` (or equivalent):

```yaml
- name: Stamp mandala with latest Merkle root
  run: make mandala-stamp

- name: Commit updated mandala
  run: |
    git config user.name "VaultMesh Bot"
    git config user.email "bot@vaultmesh.dev"
    git add docs/VaultMesh_Mandala.svg
    git diff --staged --quiet || git commit -m "chore(docs): Auto-stamp mandala Merkle root [skip ci]"
    git push
```

### GitLab CI

```yaml
stamp-mandala:
  stage: deploy
  needs: [merkle-rollup]
  script:
    - make mandala-stamp
    - git add docs/VaultMesh_Mandala.svg
    - git diff --staged --quiet || git commit -m "chore(docs): Auto-stamp mandala [skip ci]"
    - git push https://oauth2:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git HEAD:${CI_COMMIT_REF_NAME}
```

---

## 2. Link Validation (CI Gate)

**When:** On every PR, before merge  
**Why:** Prevents broken Sacred Text links from reaching main  
**Cost:** <1s execution time

### GitHub Actions

Add to `.github/workflows/ci.yml`:

```yaml
- name: Validate mandala links
  run: make mandala-link-check
```

This **fails the build** if any of the 6 links point to missing files or broken anchors.

### Pre-commit Hook (Local)

Add to `.git/hooks/pre-commit`:

```bash
#!/usr/bin/env bash
echo "🔗 Checking mandala links..."
make mandala-link-check || {
  echo "❌ Mandala has broken links. Fix before committing."
  exit 1
}
```

---

## 3. PNG/WebP Export (Build Artifacts)

**When:** On release tags or nightly builds  
**Why:** Provides ready-to-use images for presentations and social media  
**Cost:** 5-10s with inkscape, <2s with rsvg-convert

### GitHub Actions (with inkscape)

```yaml
- name: Install export tools
  run: sudo apt-get update && sudo apt-get install -y inkscape webp

- name: Export mandala PNG/WebP
  run: |
    make mandala-png
    make mandala-webp

- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: mandala-exports
    path: |
      docs/VaultMesh_Mandala.png
      docs/VaultMesh_Mandala.webp
    retention-days: 90
```

### GitHub Actions (Puppeteer fallback, no system deps)

```yaml
- name: Install puppeteer
  run: pnpm add -D puppeteer

- name: Export mandala PNG via Puppeteer
  run: node scripts/mandala-export-png.mjs --width=2400

- name: Upload artifact
  uses: actions/upload-artifact@v3
  with:
    name: mandala-png
    path: docs/VaultMesh_Mandala.png
    retention-days: 90
```

---

## 4. Social Media Preset (Quick Share)

**When:** Manual trigger or on releases  
**Why:** 1600×1600 WebP optimized for Twitter/LinkedIn  
**Cost:** 3-5s

### Makefile Target (add this)

```makefile
.PHONY: mandala-social
mandala-social:
	@echo "📱 Exporting mandala for social media..."
	@if command -v rsvg-convert >/dev/null 2>&1; then \
	    rsvg-convert -f png -w 1600 -o docs/VaultMesh_Mandala_social.png docs/VaultMesh_Mandala.svg; \
	    echo "✅ docs/VaultMesh_Mandala_social.png (1600×1600)"; \
	  else \
	    echo "❌ Install rsvg-convert (librsvg2-bin) for social export"; \
	    exit 1; \
	fi
	@if command -v cwebp >/dev/null 2>&1; then \
	    cwebp -q 92 docs/VaultMesh_Mandala_social.png -o docs/VaultMesh_Mandala_social.webp; \
	    echo "✅ docs/VaultMesh_Mandala_social.webp (~100KB)"; \
	  else \
	    echo "⚠️  Install cwebp for WebP optimization"; \
	fi
```

### GitHub Actions Workflow (manual dispatch)

```yaml
name: Export Mandala for Social
on:
  workflow_dispatch:

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: sudo apt-get update && sudo apt-get install -y librsvg2-bin webp
      - run: make mandala-social
      - uses: actions/upload-artifact@v3
        with:
          name: mandala-social
          path: docs/VaultMesh_Mandala_social.*
          retention-days: 30
```

**Usage:** Go to Actions tab → "Export Mandala for Social" → Run workflow → Download artifact

---

## 5. Release Automation

**When:** On version tags (e.g., `v1.0.0`)  
**Why:** Attach Mandala exports to GitHub releases automatically

### GitHub Actions

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install export tools
        run: sudo apt-get update && sudo apt-get install -y inkscape webp
      
      - name: Export mandala
        run: |
          make mandala-png
          make mandala-webp
      
      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            docs/VaultMesh_Mandala.svg
            docs/VaultMesh_Mandala.png
            docs/VaultMesh_Mandala.webp
          body: |
            ## 🌀 VaultMesh Mandala
            
            **Downloads:**
            - `VaultMesh_Mandala.svg` — Interactive (11KB)
            - `VaultMesh_Mandala.png` — High-res (2200×2200, ~300KB)
            - `VaultMesh_Mandala.webp` — Optimized (~100KB)
```

---

## 6. Documentation Site Integration

If you host docs with GitHub Pages, GitBook, or similar:

### GitHub Pages (Jekyll)

```yaml
# In your docs build workflow
- name: Copy mandala to docs site
  run: |
    mkdir -p _site/images
    cp docs/VaultMesh_Mandala.svg _site/images/
    make mandala-png
    cp docs/VaultMesh_Mandala.png _site/images/
```

### GitBook

Add to `book.json`:

```json
{
  "structure": {
    "readme": "README.md"
  },
  "plugins": ["image-captions"],
  "pluginsConfig": {
    "image-captions": {
      "images": {
        "mandala": "docs/VaultMesh_Mandala.svg"
      }
    }
  }
}
```

---

## 7. Docker Image (Mandala in Container)

Include the Mandala in your Docker image for offline docs:

```dockerfile
# In your Dockerfile
COPY docs/VaultMesh_Mandala.svg /app/public/
COPY docs/MANDALA*.md /app/docs/

# Optional: generate PNG at build time
RUN apt-get update && apt-get install -y librsvg2-bin && \
    rsvg-convert -f png -w 2400 -o /app/public/VaultMesh_Mandala.png /app/public/VaultMesh_Mandala.svg
```

---

## 8. Verify Before Deploy (Pre-deployment Gate)

Add mandala checks to your deployment workflow:

```yaml
- name: Pre-deployment checks
  run: |
    echo "🔗 Validating mandala links..."
    make mandala-link-check
    
    echo "📐 Validating SVG structure..."
    grep -q 'xmlns:xlink' docs/VaultMesh_Mandala.svg || exit 1
    grep -q '<a xlink:href' docs/VaultMesh_Mandala.svg || exit 1
    
    echo "✅ Mandala ready for deployment"
```

---

## 9. Slack/Discord Notifications (with Preview)

Send Mandala to team channels on updates:

```yaml
- name: Export social preview
  run: make mandala-social

- name: Notify team
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "🌀 Mandala updated with latest Merkle root",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*VaultMesh Mandala* updated with today's Merkle root"
            }
          },
          {
            "type": "image",
            "image_url": "https://github.com/VaultSovereign/forge/raw/main/docs/VaultMesh_Mandala.svg",
            "alt_text": "VaultMesh Mandala"
          }
        ]
      }
```

---

## 10. Security: Link Allowlist

Extend `mandala-link-check.mjs` to verify links only point to allowed domains:

```javascript
const ALLOWED_TARGETS = [
  /^DEPLOY_GCP\.md$/,
  /^RECEIPTS\.md/,
  /^GUARDIAN_ALERTING\.md$/,
  /^CIVILIZATION_COVENANT\.md/,
];

for (const href of hrefs) {
  const [filePath] = href.split("#");
  if (!ALLOWED_TARGETS.some(pattern => pattern.test(filePath))) {
    console.error(`❌ Disallowed link target: ${href}`);
    ok = false;
  }
}
```

This prevents accidental external links or sensitive file references.

---

## Complete CI Example

Here's a full workflow combining all best practices:

```yaml
name: Mandala CI
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM UTC

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Validate mandala links
        run: make mandala-link-check
      
      - name: Stamp mandala (nightly only)
        if: github.event_name == 'schedule'
        run: make mandala-stamp
      
      - name: Export PNG/WebP (nightly only)
        if: github.event_name == 'schedule'
        run: |
          sudo apt-get update && sudo apt-get install -y librsvg2-bin webp
          make mandala-png
          make mandala-webp
      
      - name: Commit stamped mandala
        if: github.event_name == 'schedule'
        run: |
          git config user.name "VaultMesh Bot"
          git config user.email "bot@vaultmesh.dev"
          git add docs/VaultMesh_Mandala.svg
          git diff --staged --quiet || git commit -m "chore(docs): Auto-stamp mandala [skip ci]"
          git push
      
      - name: Upload exports
        if: github.event_name == 'schedule'
        uses: actions/upload-artifact@v3
        with:
          name: mandala-exports
          path: docs/VaultMesh_Mandala.*
          retention-days: 90
```

---

## Quick Command Reference

```bash
# Local development
make mandala-link-check  # Validate links
make mandala-stamp       # Update Merkle root
make mandala-open        # Preview in browser

# Export
make mandala-png         # High-res PNG (2200×2200)
make mandala-webp        # Optimized WebP
make mandala-social      # Social media preset (1600×1600)

# CI integration
git add docs/VaultMesh_Mandala.svg
git commit -m "chore(docs): Update mandala"
```

---

**Steel sung. The Mandala integrates seamlessly into your CI/CD forge. Every push validates, every night stamps, every release exports.** ⚔️
