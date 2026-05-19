# Build / validate / test / deploy
.DEFAULT_GOAL := validate

PYTHON    ?= python3

TENANT    ?= euromobilia
DOMAIN    ?= kitchen-commerce
CAPABILITY?= kitchen-quotation
TARGET    ?= langgraph
ENV       ?= dev
ASSET     ?= quotation-assistant

.PHONY: help validate validate-specs validate-agent-context validate-credentials knowledge-index test scaffold-tenant scaffold-domain scaffold-capability scaffold-asset compile-langgraph compile-n8n compile-codewords n8n-compile n8n-deploy n8n-diff n8n-migrate n8n-audit n8n-credentials-encrypt scaffold-fork sync-fork rebase-agentyx build-forks connect-railway-scratch build-fork-images deploy-ghcr-images

help:
	@echo "Targets: validate, validate-specs, validate-agent-context, validate-credentials, knowledge-index, test, scaffold-tenant, scaffold-domain, scaffold-capability, scaffold-asset, compile-langgraph, compile-n8n, compile-codewords, n8n-compile, n8n-deploy, n8n-diff, n8n-migrate, n8n-audit, n8n-credentials-encrypt, scaffold-fork, sync-fork, rebase-agentyx, build-forks, connect-railway-scratch, build-fork-images, deploy-ghcr-images"

validate: validate-specs validate-agent-context validate-credentials

validate-specs:
	$(PYTHON) scripts/validate_specs.py

validate-agent-context:
	$(PYTHON) scripts/validate_agent_context.py

validate-credentials:
	$(PYTHON) scripts/validate_credentials.py --tenant $(TENANT)

knowledge-index:
	$(PYTHON) scripts/knowledge_index.py

test:
	$(PYTHON) -m pytest scripts/ -q

scaffold-tenant:
	$(PYTHON) scripts/scaffold_tenant.py --tenant $(TENANT)

scaffold-domain:
	$(PYTHON) scripts/scaffold_domain.py --tenant $(TENANT) --domain $(DOMAIN)

scaffold-capability:
	$(PYTHON) scripts/scaffold_capability.py --tenant $(TENANT) --domain $(DOMAIN) --capability $(CAPABILITY)

scaffold-asset:
	$(PYTHON) scripts/scaffold_asset.py --tenant $(TENANT) --domain $(DOMAIN) --capability $(CAPABILITY) --asset $(ASSET) --type $(TARGET)

compile-langgraph:
	$(PYTHON) scripts/compile_langgraph_asset.py --tenant $(TENANT) --domain $(DOMAIN) --capability $(CAPABILITY) --asset $(ASSET)

compile-n8n:
	$(PYTHON) scripts/compile_n8n_asset.py --tenant $(TENANT) --domain $(DOMAIN) --capability $(CAPABILITY) --asset $(ASSET)

compile-codewords:
	$(PYTHON) scripts/compile_codewords_prompt.py --tenant $(TENANT) --domain $(DOMAIN) --capability $(CAPABILITY)

n8n-compile:
	agentyx n8n compile --tenant $(TENANT) --asset $(ASSET)

n8n-deploy:
	agentyx n8n deploy --tenant $(TENANT) --env $(ENV) --commit $(shell git rev-parse HEAD)

n8n-diff:
	agentyx n8n diff --tenant $(TENANT) --env $(ENV)

n8n-migrate:
	agentyx n8n migrate --tenant $(TENANT) --env $(ENV) --direction live-to-repo

n8n-audit:
	agentyx n8n audit --tenant $(TENANT) --since $(shell date -d '7 days ago' +%Y-%m-%d)

n8n-credentials-encrypt:
	agentyx n8n credentials encrypt --tenant $(TENANT) --file $(FILE)

scaffold-fork:
	bash scripts/forks/bootstrap-fork.sh --upstream $(UPSTREAM) --name $(APP)

sync-fork:
	bash scripts/forks/sync-upstream.sh --name $(APP)

rebase-agentyx:
	bash scripts/forks/rebase-agentyx.sh --name $(APP)

build-forks:
	@echo "Building all fork images (Phase 2). Run per-fork workflows in .github/workflows/"

connect-railway-scratch:
	bash scripts/railway/link-scratch.sh

build-fork-images:
	bash scripts/forks/build-and-push-images.sh $(APP)

deploy-ghcr-images:
	bash scripts/railway/deploy-ghcr-images.sh
