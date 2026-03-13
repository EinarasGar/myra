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
auth ?= noauth
.PHONY: setup-env
setup-env: ## Create .env file (worktree-aware). Use auth=noauth|database|clerk
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
		"COOKIE_SECURE=false" \
		> .env; \
	case "$(auth)" in \
		noauth|database) \
			printf '\n%s\n' "AUTH_PROVIDER=$(auth)" >> .env; \
			;; \
		clerk) \
			if [ ! -f .secrets ]; then \
				echo "$(RED)Error: .secrets file not found. Copy .secrets.example to .secrets and fill in your Clerk keys.$(NC)"; \
				exit 1; \
			fi; \
			. ./.secrets; \
			if [ -z "$$CLERK_PUBLISHABLE_KEY" ] || [ -z "$$CLERK_SECRET_KEY" ]; then \
				echo "$(RED)Error: CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY must be set in .secrets$(NC)"; \
				exit 1; \
			fi; \
			printf '\n%s\n\n%s\n%s\n%s\n' \
				"AUTH_PROVIDER=clerk" \
				"# Required when AUTH_PROVIDER=clerk" \
				"CLERK_PUBLISHABLE_KEY=$$CLERK_PUBLISHABLE_KEY" \
				"CLERK_SECRET_KEY=$$CLERK_SECRET_KEY" \
				>> .env; \
			;; \
		*) \
			echo "$(RED)Error: Unknown auth provider '$(auth)'. Use noauth, database, or clerk.$(NC)"; \
			exit 1; \
			;; \
	esac; \
	echo "$(GREEN).env created (auth=$(auth)):$(NC)"; \
	cat .env
	@echo ""
	@echo "$(GREEN)Installing UI dependencies...$(NC)"
	cd ui && bun install
	@echo "$(GREEN)Building Rust workspace...$(NC)"
	cd server && cargo build
	@echo "$(GREEN)Setup complete!$(NC)"

# Status
.PHONY: status
status: ## Show service ports, status, and useful links
	@echo "$(GREEN)Auth Provider:$(NC)    $(YELLOW)$(AUTH_PROVIDER)$(NC)"
	@PROJ=$$(basename $$(pwd)); \
	if docker volume inspect $${PROJ}_myra-postgres-data >/dev/null 2>&1; then \
		echo "$(GREEN)Database Volume:$(NC)  $(GREEN)Yes$(NC)"; \
	else \
		echo "$(GREEN)Database Volume:$(NC)  $(RED)No$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)Links$(NC)"
	@echo "=================================="
	@echo "$(YELLOW)UI$(NC)              http://localhost:$(VITE_PORT)/"
	@echo "$(YELLOW)Redoc$(NC)           http://localhost:$(SERVER_PORT)/redoc"
	@echo "$(YELLOW)APIs$(NC)            http://localhost:$(SERVER_PORT)/api"
	@echo ""
	@echo "$(GREEN)Myra - Service Ports$(NC)"
	@echo "=================================="
	@DOCKER_PS=$$(timeout 3 docker-compose ps --format json 2>/dev/null || true); \
	check_docker() { \
		echo "$$DOCKER_PS" | grep -q "\"$$1\"" && echo "$$DOCKER_PS" | grep "\"$$1\"" | grep -qi '"running"'; \
	}; \
	check_infra() { \
		local name=$$1 port=$$2 service=$$3; \
		if check_docker $$service; then \
			echo "$(YELLOW)$$name$(NC)  http://localhost:$$port - $(GREEN)Running$(NC)"; \
		elif nc -z -G 1 localhost $$port 2>/dev/null; then \
			echo "$(YELLOW)$$name$(NC)  http://localhost:$$port - $(RED)Port in use (not docker!)$(NC)"; \
		else \
			echo "$(YELLOW)$$name$(NC)  http://localhost:$$port - $(RED)Not Running$(NC)"; \
		fi; \
	}; \
	check_local() { \
		local name=$$1 port=$$2; \
		if nc -z -G 1 localhost $$port 2>/dev/null; then \
			echo "$(YELLOW)$$name$(NC)  http://localhost:$$port - $(GREEN)Running$(NC)"; \
		else \
			echo "$(YELLOW)$$name$(NC)  http://localhost:$$port - $(RED)Not Running$(NC)"; \
		fi; \
	}; \
	check_infra "Postgres      " $(POSTGRES_PORT) database; \
	check_local "API Server    " $(SERVER_PORT); \
	check_local "Vite Dev      " $(VITE_PORT); \
	check_infra "OTLP Collector" $(OTLP_PORT) jaeger; \
	check_infra "Jaeger UI     " $(JAEGER_UI_PORT) jaeger

# Run
.PHONY: run-backend
run-backend: ## Start API server (kills existing process on SERVER_PORT first)
	-@lsof -ti :$(SERVER_PORT) | xargs kill -9 2>/dev/null || true
	cd server && cargo run -p api --no-default-features --features $(AUTH_PROVIDER),color-sql

.PHONY: run-ui
run-ui: ## Start Vite dev server (kills existing process on VITE_PORT first)
	-@lsof -ti :$(VITE_PORT) | xargs kill -9 2>/dev/null || true
	cd ui && bun run dev

# Infrastructure
.PHONY: start-infra
start-infra: ## Start infrastructure services (Postgres, Jaeger, etc.)
	docker-compose up -d

.PHONY: refresh-infra
refresh-infra: ## Wipe volumes and restart infrastructure services
	docker-compose down -v
	docker-compose up -d

# Database
.PHONY: export-db
export-db: ## Export database data to db_dump.sql
	@echo "$(GREEN)Exporting database data...$(NC)"
	@PGPASSWORD=$(POSTGRES_PASSWORD) pg_dump -h localhost -p $(POSTGRES_PORT) -U $(POSTGRES_USER) -d $(POSTGRES_DB) --data-only > db_dump.sql
	@echo "$(GREEN)Database data exported to db_dump.sql$(NC)"

.PHONY: import-db
import-db: ## Import database data from db_dump.sql (truncates existing data first)
	@echo "$(YELLOW)Truncating existing data...$(NC)"
	@PGPASSWORD=$(POSTGRES_PASSWORD) psql -h localhost -p $(POSTGRES_PORT) -U $(POSTGRES_USER) -d $(POSTGRES_DB) -c \
		"DO \$$\$$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'flyway_%') LOOP EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END \$$\$$;"
	@echo "$(GREEN)Importing database data...$(NC)"
	@PGPASSWORD=$(POSTGRES_PASSWORD) psql -h localhost -p $(POSTGRES_PORT) -U $(POSTGRES_USER) -d $(POSTGRES_DB) < db_dump.sql
	@echo "$(GREEN)Database data imported from db_dump.sql$(NC)"

# API Generation
.PHONY: generate-api
generate-api: ## Generate TypeScript API client from OpenAPI spec
	@echo "$(GREEN)Compiling and generating OpenAPI spec...$(NC)"
	@TEMP_FILE=$$(mktemp /tmp/openapi.XXXXXX.json); \
	if (cd server && cargo run -p api --no-default-features --features database,color-sql -- --openapi) > $$TEMP_FILE 2>/dev/null; then \
		echo "$(GREEN)OpenAPI spec generated successfully$(NC)"; \
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
		echo "$(RED)Error: Failed to generate OpenAPI spec. Check Rust compilation errors:$(NC)"; \
		(cd server && cargo run -p api --no-default-features --features database,color-sql -- --openapi) 2>&1 || true; \
		rm -f $$TEMP_FILE; \
		exit 1; \
	fi
