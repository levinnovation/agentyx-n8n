# Build / validate / test / deploy
.DEFAULT_GOAL := validate

TENANT    ?= euromobilia
DOMAIN    ?= kitchen-commerce
CAPABILITY?= kitchen-quotation
TARGET    ?= langgraph
ENV       ?= dev
ASSET     ?= quotation-assistant

.PHONY: help validate test scaffold-tenant scaffold-domain scaffold-capability scaffold-asset compile-langgraph compile-n8n compile-codewords

help:
	@echo "Targets: validate, test, scaffold-tenant, scaffold-domain, scaffold-capability, scaffold-asset, compile-langgraph, compile-n8n, compile-codewords"

validate:
	python scripts/validate_specs.py

test:
	pytest scripts/ -q

scaffold-tenant:
	python scripts/scaffold_tenant.py --tenant $(TENANT)

scaffold-domain:
	python scripts/scaffold_domain.py --tenant $(TENANT) --domain $(DOMAIN)

scaffold-capability:
	python scripts/scaffold_capability.py --tenant $(TENANT) --domain $(DOMAIN) --capability $(CAPABILITY)

scaffold-asset:
	python scripts/scaffold_asset.py --tenant $(TENANT) --domain $(DOMAIN) --capability $(CAPABILITY) --asset $(ASSET) --type $(TARGET)

compile-langgraph:
	python scripts/compile_langgraph_asset.py --tenant $(TENANT) --domain $(DOMAIN) --capability $(CAPABILITY) --asset $(ASSET)

compile-n8n:
	python scripts/compile_n8n_asset.py --tenant $(TENANT) --domain $(DOMAIN) --capability $(CAPABILITY) --asset $(ASSET)

compile-codewords:
	python scripts/compile_codewords_prompt.py --tenant $(TENANT) --domain $(DOMAIN) --capability $(CAPABILITY)
