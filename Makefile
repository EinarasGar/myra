# Myra Personal Finance
# ================================================

-include .env

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Default target
.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)Myra - Available Commands$(NC)"
	@echo "=================================="
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

# Setup
.PHONY: setup-env
setup-env: ## Create .env file (worktree-aware: generates unique ports per worktree)
	@if [ "$$(git rev-parse --git-common-dir 2>/dev/null)" != "$$(git rev-parse --git-dir 2>/dev/null)" ]; then \
		WORKTREE_NAME=$$(basename $$(pwd)); \
		HASH=$$(printf '%s' "$$WORKTREE_NAME" | cksum | awk '{print $$1}'); \
		PREFIX=$$(printf '%02d' $$((HASH % 99 + 1))); \
		echo "$(GREEN)Worktree detected: $$WORKTREE_NAME (port prefix: $$PREFIX)$(NC)"; \
	else \
		PREFIX="00"; \
	fi; \
	printf '%s\n' \
		"POSTGRES_USER=myradev" \
		"POSTGRES_PASSWORD=devpassword" \
		"POSTGRES_DB=myra" \
		"RUST_LOG=dal=trace,business=trace,api=trace,tower_http=info" \
		"JWT_SECRET=devjwtsecret" \
		"" \
		"POSTGRES_PORT=7$${PREFIX}1" \
		"SERVER_PORT=7$${PREFIX}2" \
		"VITE_PORT=7$${PREFIX}3" \
		"OTLP_PORT=7$${PREFIX}4" \
		"JAEGER_UI_PORT=7$${PREFIX}5" \
		> .env; \
	echo "$(GREEN).env created:$(NC)"; \
	cat .env
	@echo ""
	@echo "$(GREEN)Installing UI dependencies...$(NC)"
	cd ui && bun install
	@echo "$(GREEN)Building Rust workspace...$(NC)"
	cd server && cargo build
	@echo "$(GREEN)Setup complete!$(NC)"

# Ports
.PHONY: ports
ports: ## List all service ports
	@echo "$(GREEN)Myra - Service Ports$(NC)"
	@echo "=================================="
	@echo "$(YELLOW)Postgres$(NC)        http://localhost:$(POSTGRES_PORT)"
	@echo "$(YELLOW)API Server$(NC)      http://localhost:$(SERVER_PORT)"
	@echo "$(YELLOW)Vite Dev$(NC)        http://localhost:$(VITE_PORT)"
	@echo "$(YELLOW)OTLP Collector$(NC)  http://localhost:$(OTLP_PORT)"
	@echo "$(YELLOW)Jaeger UI$(NC)       http://localhost:$(JAEGER_UI_PORT)"

# API Generation
.PHONY: generate-api
generate-api: ## Generate TypeScript API client from OpenAPI spec
	@echo "$(GREEN)Downloading OpenAPI spec from localhost:$(SERVER_PORT)...$(NC)"
	@TEMP_FILE=$$(mktemp /tmp/openapi.XXXXXX.json); \
	if curl -f -s http://localhost:$(SERVER_PORT)/api-docs/openapi.json -o $$TEMP_FILE; then \
		echo "$(GREEN)OpenAPI spec downloaded successfully$(NC)"; \
		echo "$(YELLOW)Converting anyOf to oneOf...$(NC)"; \
		sed -i '' 's/"anyOf"/"oneOf"/g' $$TEMP_FILE; \
		echo "$(GREEN)Generating API client...$(NC)"; \
		cd ui; \
		npx @openapitools/openapi-generator-cli generate -i $$TEMP_FILE -g typescript-axios --skip-validate-spec -o src/api --additional-properties=withInterfaces=true,legacyDiscriminatorBehavior=true,supportsES6=true; \
		echo "$(YELLOW)Cleaning up generated files...$(NC)"; \
		rm -rf src/api/.openapi-generator src/api/.gitignore src/api/.npmignore src/api/.openapi-generator-ignore src/api/git_push.sh; \
		sed -i '' '2d' src/api/index.ts; \
		sed -i '' '1s/^/\/\/ @ts-nocheck\n/' src/api/api.ts; \
		echo "$(YELLOW)Removing temporary file...$(NC)"; \
		rm -f $$TEMP_FILE; \
		echo "$(YELLOW)Formatting generated files...$(NC)"; \
		bunx prettier --write "src/api/**/*.ts"; \
		echo "$(GREEN)API client generated successfully!$(NC)"; \
	else \
		echo "$(RED)Error: Cannot download OpenAPI spec from http://localhost:$(SERVER_PORT)/api-docs/openapi.json$(NC)"; \
		echo "$(RED)Make sure the web server is running on port $(SERVER_PORT)$(NC)"; \
		rm -f $$TEMP_FILE; \
		exit 1; \
	fi
