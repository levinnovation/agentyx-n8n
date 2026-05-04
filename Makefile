# Build / validate / test / deploy
.DEFAULT_GOAL := validate

PYTHON    ?= python3

TENANT    ?= euromobilia
DOMAIN    ?= kitchen-commerce
CAPABILITY?= kitchen-quotation
TARGET    ?= langgraph
ENV       ?= dev
ASSET     ?= quotation-assistant

.PHONY: help validate validate-specs validate-agent-context knowledge-index test scaffold-tenant scaffold-domain scaffold-capability scaffold-asset compile-langgraph compile-n8n compile-codewords scaffold-fork sync-fork rebase-agentyx build-forks connect-railway-scratch build-fork-images deploy-ghcr-images

help:
	@echo "Targets: validate, validate-specs, validate-agent-context, knowledge-index, test, scaffold-tenant, scaffold-domain, scaffold-capability, scaffold-asset, compile-langgraph, compile-n8n, compile-codewords, scaffold-fork, sync-fork, rebase-agentyx, build-forks, connect-railway-scratch, build-fork-images, deploy-ghcr-images"

validate: validate-specs validate-agent-context

validate-specs:
	$(PYTHON) scripts/validate_specs.py

validate-agent-context:
	$(PYTHON) scripts/validate_agent_context.py

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
