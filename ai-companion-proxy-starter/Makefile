PROJECT_ID ?= $(shell gcloud config get-value project)
REGION ?= europe-west3
SERVICE ?= ai-companion-proxy
AR_REPO ?= $(REGION)-docker.pkg.dev/$(PROJECT_ID)/forge

# Path anchors
ROOT := $(abspath $(CURDIR)/..)
ART_DIR := $(CURDIR)/artifacts/drills
ROOTS_DIR := $(CURDIR)/artifacts/roots
SCHEMA := $(CURDIR)/schemas/guardian-drill.receipt.schema.json
MERKLE := $(CURDIR)/scripts/merkle-rollup.sh

.PHONY: enable deploy url smoke budget alerts driver proxy-url proxy-token proxy-health-auth proxy-who proxy-drill proxy-receipts proxy-receipts-validate proxy-receipts-verify proxy-receipts-gc proxy-receipts-root

enable:
	gcloud services enable run.googleapis.com logging.googleapis.com monitoring.googleapis.com iam.googleapis.com cloudresourcemanager.googleapis.com cloudaicompanion.googleapis.com artifactregistry.googleapis.com
	gcloud iam service-accounts create $(SERVICE) --display-name="AI Companion Proxy" || true
	gcloud projects add-iam-policy-binding $(PROJECT_ID) --member="serviceAccount:$(SERVICE)@$(PROJECT_ID).iam.gserviceaccount.com" --role="roles/run.invoker" || true
	gcloud projects add-iam-policy-binding $(PROJECT_ID) --member="serviceAccount:$(SERVICE)@$(PROJECT_ID).iam.gserviceaccount.com" --role="roles/iam.serviceAccountTokenCreator" || true

deploy:
	# Build, push to Artifact Registry, and deploy via Cloud Build
	gcloud builds submit --config cloudbuild.yaml --substitutions=_REGION=$(REGION)

url:
	@gcloud run services describe $(SERVICE) --region $(REGION) --format='value(status.url)'

smoke:
	@URL=$$(gmake url 2>/dev/null || make url); \
	curl -s $$URL/health | jq .

budget:
	./scripts/create-budget.sh

alerts:
	gcloud logging metrics create ai_companion_requests --description="Proxy request count" --log-filter='jsonPayload.target="https://cloudaicompanion.googleapis.com" AND jsonPayload.level="INFO"' || true

driver:
	./scripts/scheduler-driver.sh

# ----- AI Companion Proxy (service) -----
.PHONY: proxy-url proxy-token proxy-health-auth proxy-who \
	proxy-receipts proxy-receipts-latest proxy-receipts-verify proxy-receipts-validate \
	proxy-receipts-gc proxy-receipts-root

proxy-url:
	@ gcloud run services describe $(SERVICE) --region=$(REGION) --format='value(status.url)'

proxy-token:
	@ AUD="$(gcloud run services describe $(SERVICE) --region=$(REGION) --format='value(status.url)')"; \
	  TOK="$(gcloud auth print-identity-token --audiences="$AUD" 2>/dev/null || true)"; \
	  if [ -z "$TOK" ]; then TOK="$(gcloud auth print-identity-token --audience="$AUD" 2>/dev/null || true)"; fi; \
	  if [ -z "$TOK" ]; then TOK="$(gcloud auth print-identity-token 2>/dev/null || true)"; fi; \
	  if [ -z "$TOK" ]; then echo "❌ No ID token. Run: gcloud auth login && gcloud auth application-default login"; exit 1; fi; \
	  echo "$TOK"

proxy-health-auth:
	@ AUD="$(gcloud run services describe $(SERVICE) --region=$(REGION) --format='value(status.url)')"; \
	  TOK="$(gcloud auth print-identity-token --audiences="$AUD" 2>/dev/null || true)"; \
	  if [ -z "$TOK" ]; then TOK="$(gcloud auth print-identity-token --audience="$AUD" 2>/dev/null || true)"; fi; \
	  if [ -z "$TOK" ]; then TOK="$(gcloud auth print-identity-token 2>/dev/null || true)"; fi; \
	  if [ -z "$TOK" ]; then echo "❌ No ID token. Run: gcloud auth login && gcloud auth application-default login"; exit 1; fi; \
	  curl -s -H "Authorization: Bearer $TOK" "$AUD/health" | jq .

proxy-who:
	@ gcloud run services get-iam-policy $(SERVICE) --region=$(REGION) \
	  --format='table(bindings.role, bindings.members)'

proxy-drill:
	@ ART_DIR="$(ART_DIR)" bash "$(CURDIR)/scripts/guardian-drill.sh"
	@ echo ""
	@ echo "📋 Latest receipt:"
	@ ls -1t $(ART_DIR)/proxy-guardian-*.json 2>/dev/null | head -n1 | \
	  xargs -I{} sh -c 'command -v jq >/dev/null 2>&1 && jq -C . {} || cat {}'

# list latest receipts (optional simple list)
proxy-receipts:
	@ ls -1t $(ART_DIR)/proxy-guardian-*.json 2>/dev/null | head -n 10

proxy-receipts-latest:
	@ set -e; \
	  latest=$$(ls -1t $(ART_DIR)/proxy-guardian-*.json 2>/dev/null | head -n1); \
	  if [ -z "$$latest" ]; then echo "no receipts in $(ART_DIR)"; exit 0; fi; \
	  echo "🧾 Latest receipt:"; \
	  echo "  $$latest"; \
	  if command -v jq >/dev/null 2>&1; then jq -C . "$$latest"; else cat "$$latest"; fi; \
	  echo ""; \
	  ALG=""; \
	  HASH=""; \
	  if command -v b3sum >/dev/null 2>&1; then \
	    ALG="BLAKE3"; \
	    HASH="$$(b3sum "$$latest" | awk '{print $$1}')"; \
	  elif command -v shasum >/dev/null 2>&1; then \
	    ALG="SHA256"; \
	    HASH="$$(shasum -a 256 "$$latest" | awk '{print $$1}')"; \
	  fi; \
	  if [ -n "$$ALG" ]; then \
	    printf "%-8s %s  %s\n" "$$ALG" "$$HASH" "$$latest"; \
	  fi; \
	  prov="$$latest.prov"; \
	  if [ -f "$$prov" ]; then \
	    echo ""; \
	    echo "📜 Provenance:"; \
	    echo "  $$prov"; \
	    cat "$$prov"; \
	    if [ -n "$$ALG" ]; then \
	      if [ "$$ALG" = "BLAKE3" ]; then \
	        PROV_HASH="$$(b3sum "$$prov" | awk '{print $$1}')"; \
	      else \
	        PROV_HASH="$$(shasum -a 256 "$$prov" | awk '{print $$1}')"; \
	      fi; \
	      printf "%-8s %s  %s\n" "$$ALG" "$$PROV_HASH" "$$prov"; \
	    fi; \
	  fi; \
	  sig="$$latest.minisig"; \
	  if [ -f "$$sig" ]; then \
	    echo ""; \
	    if command -v minisign >/dev/null 2>&1; then \
	      echo "🔏 Minisign verification"; \
	      if minisign -Vm "$$latest" -P "$(CURDIR)/keys/guardian.pub" >/dev/null 2>&1; then \
	        echo "✅ signature valid"; \
	      else \
	        echo "❌ signature invalid"; \
	      fi; \
	    else \
	      echo "⚠️ minisign signature present but 'minisign' binary not found"; \
	    fi; \
	  fi; \
	  stamp=$$(basename "$$latest" .json | sed -E 's/^proxy-guardian-([0-9]{8}).*/\1/'); \
	  if [ -n "$$stamp" ]; then \
	    day=$$(echo "$$stamp" | sed -E 's/(....)(..)(..)/\1-\2-\3/'); \
	    root_file="$(ROOTS_DIR)/root-$$day.json"; \
	    echo ""; \
	    if [ -f "$$root_file" ]; then \
	      echo "🌳 Merkle root ($$root_file):"; \
	      cat "$$root_file"; \
	    else \
	      echo "🌳 Merkle root: missing (run 'make proxy-receipts-root' to generate)"; \
	    fi; \
	  fi

proxy-receipts-verify:
	@ for f in $$(ls -1t $(ART_DIR)/proxy-guardian-*.json 2>/dev/null | head -n 10); do \
	  if command -v b3sum >/dev/null 2>&1; then H=$$(b3sum $$f | awk '{print $$1}'); ALG=BLAKE3; \
	  elif command -v shasum >/dev/null 2>&1; then H=$$(shasum -a 256 $$f | awk '{print $$1}'); ALG=SHA256; \
	  else H="UNAVAILABLE"; ALG="UNKNOWN"; fi; \
	  printf "%-8s %s  %s\n" "$$ALG" "$$H" "$$f"; \
	done

proxy-receipts-validate:
	@ node -e 'import Ajv from "ajv"; import addFormats from "ajv-formats"; import fs from "node:fs"; import path from "node:path"; const dir="$(ART_DIR)"; const schema=JSON.parse(fs.readFileSync("$(SCHEMA)","utf8")); const ajv=new Ajv({allErrors:true,strict:false}); addFormats(ajv); const validate=ajv.compile(schema); const files=(fs.existsSync(dir)?fs.readdirSync(dir):[]).filter(f=>f.endsWith(".json")).slice(-10); let ok=true; for(const f of files){ const j=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")); if(!validate(j)){ok=false; console.error("❌",f,ajv.errorsText(validate.errors));} else {console.log("✅",f);} } if(!ok) process.exit(1);'

proxy-receipts-gc:
	@ set -e; keep=100; files=$$(ls -1t $(ART_DIR)/proxy-guardian-*.json 2>/dev/null || true); \
	  idx=0; for f in $$files; do \
	    idx=$$((idx+1)); \
	    if [ $$idx -le $$keep ]; then continue; fi; \
	    rm -f "$$f" "$$f.prov" "$$f.minisig" 2>/dev/null || true; \
	  done; \
	  echo "🧹 GC complete (kept $$keep latest in $(ART_DIR))"

proxy-receipts-root:
	@ DIR="$(ART_DIR)" OUT="$(ROOTS_DIR)" bash "$(MERKLE)"
