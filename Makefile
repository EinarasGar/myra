# Myra Personal Finance
# ================================================

-include .env

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# PIDs of THIS worktree's worker processes (the worker has no port). The worker binary's
# argv is the relative path "target/debug/worker", identical across worktrees, so we match
# the command and then confirm each process's cwd is inside this worktree before acting on
# it — otherwise we'd touch workers belonging to other worktrees.
# The patterns bracket their first char ([t]arget, [c]argo) so this very command line — which
# contains the patterns — does not self-match pgrep (the classic `ps | grep [p]attern` trick).
WORKER_PIDS = $$({ pgrep -f "[t]arget/debug/worker"; pgrep -f "[c]argo run -p worker"; } 2>/dev/null | sort -u | while read -r pid; do cwd=$$(lsof -a -d cwd -p $$pid -Fn 2>/dev/null | sed -n 's/^n//p'); case "$$cwd" in ("$(CURDIR)"|"$(CURDIR)"/*) echo $$pid ;; esac; done)

ANDROID_SDK = $(HOME)/Library/Android/sdk
ADB = $(ANDROID_SDK)/platform-tools/adb
EMULATOR = $(ANDROID_SDK)/emulator/emulator
AVDMANAGER = $(ANDROID_SDK)/cmdline-tools/latest/bin/avdmanager
SDKMANAGER = $(ANDROID_SDK)/cmdline-tools/latest/bin/sdkmanager
ANDROID_SYSTEM_IMAGE ?= system-images;android-37.0;google_apis_playstore_ps16k;arm64-v8a
AVD_DIR = $(HOME)/.android/avd/$(ANDROID_AVD_NAME).avd
# Serial of the running emulator that booted THIS worktree's AVD (empty if none). Resolved by AVD
# name through the emulator console, not by port, so it also finds the AVD when Android Studio
# launched it on whatever port was free.
AVD_SERIAL = $$(for s in $$($(ADB) devices 2>/dev/null | awk '/^emulator-/ {print $$1}'); do if [ "$$($(ADB) -s $$s emu avd name 2>/dev/null | head -n1 | tr -d '\r')" = "$(ANDROID_AVD_NAME)" ]; then echo $$s; break; fi; done)
PHYSICAL_SERIALS = $$($(ADB) devices 2>/dev/null | awk '$$2 == "device" && $$1 !~ /^emulator-/ {print $$1}')

# Default target
.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)Myra - Available Commands$(NC)"
	@echo "=================================="
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

# Setup
auth ?= noauth
telemetry ?= local
secrets ?= db
LANDING_SITE_URL ?= https://sverto.com
LANDING_APP_URL ?= https://app.sverto.com
# Port scheme: 2<PREFIX><SS> -> 20000-29999. PREFIX = 2-digit worktree id (00 = main,
# 01-99 = worktree hash); SS = 2-digit service slot (00-99, 100 slots). Add a service
# by giving it the next free SS. Stays clear of macOS-reserved 5000/7000 and the
# ephemeral range (49152+).
.PHONY: setup-env
setup-env: ## Create .env file (worktree-aware). Use auth=noauth|database|clerk telemetry=local|axiom secrets=db|vault
	@if [ "$$(git rev-parse --git-common-dir 2>/dev/null)" != "$$(git rev-parse --git-dir 2>/dev/null)" ]; then \
		WORKTREE_NAME=$$(basename $$(pwd)); \
		HASH=$$(printf '%s' "$$WORKTREE_NAME" | cksum | awk '{print $$1}'); \
		PREFIX=$$(printf '%02d' $$((HASH % 99 + 1))); \
		AVD_NAME="myra-$$(printf '%s' "$$WORKTREE_NAME" | tr -c 'A-Za-z0-9._-' '_')"; \
		echo "$(GREEN)Worktree detected: $$WORKTREE_NAME (port prefix: $$PREFIX, AVD: $$AVD_NAME)$(NC)"; \
	else \
		PREFIX="00"; \
		AVD_NAME="myra-main"; \
	fi; \
	case "$(telemetry)" in \
		local) \
			OTLP_TRACES_ENDPOINT_VALUE="http://localhost:2$${PREFIX}04/v1/traces"; \
			OTLP_LOGS_ENDPOINT_VALUE="http://localhost:2$${PREFIX}00/ingest/otlp/v1/logs"; \
			;; \
		axiom) \
			OTLP_TRACES_ENDPOINT_VALUE="https://us-east-1.aws.edge.axiom.co/v1/traces"; \
			OTLP_LOGS_ENDPOINT_VALUE="https://us-east-1.aws.edge.axiom.co/v1/logs"; \
			;; \
		*) \
			echo "$(RED)Error: Unknown telemetry provider '$(telemetry)'. Use local or axiom.$(NC)"; \
			exit 1; \
			;; \
	esac; \
	printf '%s\n' \
		"POSTGRES_USER=myradev" \
		"POSTGRES_PASSWORD=devpassword" \
		"POSTGRES_DB=myra" \
		"RUST_LOG=info,api=debug,business=debug,dal=debug,worker=debug,ai=debug,tower_http=info,rig=info,hyper=warn,h2=warn,reqwest=warn,sqlx=warn" \
		"JWT_SECRET=devjwtsecret" \
		"" \
		"POSTGRES_PORT=2$${PREFIX}01" \
		"SERVER_PORT=2$${PREFIX}02" \
		"VITE_PORT=2$${PREFIX}03" \
		"LANDING_PORT=2$${PREFIX}11" \
		"OTLP_PORT=2$${PREFIX}04" \
		"OTLP_TRACES_ENDPOINT=$${OTLP_TRACES_ENDPOINT_VALUE}" \
		"OTLP_LOGS_ENDPOINT=$${OTLP_LOGS_ENDPOINT_VALUE}" \
		"JAEGER_UI_PORT=2$${PREFIX}05" \
		"SEQ_PORT=2$${PREFIX}00" \
		"COOKIE_SECURE=false" \
		"MINIO_PORT=2$${PREFIX}06" \
		"MINIO_CONSOLE_PORT=2$${PREFIX}07" \
		"REDIS_PORT=2$${PREFIX}08" \
		"REDIS_URL=redis://localhost:2$${PREFIX}08" \
		"VAULT_PORT=2$${PREFIX}10" \
		"VAULT_TOKEN=dev-token" \
		"MARKET_DATA_PORT=2$${PREFIX}09" \
		"MARKET_DATA_URL=http://localhost:2$${PREFIX}09" \
		"MARKET_DATA_API_KEY=dev-market-data-key" \
		"S3_ENDPOINT=http://localhost:2$${PREFIX}06" \
		"S3_BUCKET_NAME=myra-files" \
		"S3_ACCESS_KEY=minioadmin" \
		"S3_SECRET_KEY=minioadmin123" \
		"S3_REGION=us-east-1" \
		> .env; \
	printf '\n%s\n%s\n' \
		"AI_MODEL=gemini-3-flash-preview" \
		"AI_EMBEDDING_MODEL=gemini-embedding-2-preview" \
		>> .env; \
	SECRETS_FILE=".secrets.dev"; \
	if [ ! -f "$$SECRETS_FILE" ]; then \
		echo "$(RED)Error: $$SECRETS_FILE not found. Copy .secrets.example to $$SECRETS_FILE and fill in values.$(NC)"; \
		exit 1; \
	fi; \
	. ./$$SECRETS_FILE; \
	printf '%s\n' "AI_API_KEY=$${AI_API_KEY}" >> .env; \
	if [ -n "$${TRUELAYER_CLIENT_ID}" ]; then \
		printf '\n%s\n%s\n%s\n%s\n%s\n' \
			"# TrueLayer" \
			"TRUELAYER_CLIENT_ID=$${TRUELAYER_CLIENT_ID}" \
			"TRUELAYER_CLIENT_SECRET=$${TRUELAYER_CLIENT_SECRET}" \
			"TRUELAYER_ENV=$${TRUELAYER_ENV}" \
			"TRUELAYER_REDIRECT_URI_ALLOWLIST=http://localhost:2$${PREFIX}03/settings/connectors/truelayer/callback,$${TRUELAYER_REDIRECT_URI_ALLOWLIST}" \
			>> .env; \
	fi; \
	if [ -n "${ENABLEBANKING_APPLICATION_ID}" ]; then \
		printf '\n%s\n%s\n%s\n%s\n' \
			"# Enable Banking" \
			"ENABLEBANKING_APPLICATION_ID=${ENABLEBANKING_APPLICATION_ID}" \
			"ENABLEBANKING_PRIVATE_KEY=\"$${ENABLEBANKING_PRIVATE_KEY}\"" \
			"ENABLEBANKING_REDIRECT_URI_ALLOWLIST=http://localhost:2$${PREFIX}02/connectors/enablebanking/callback,http://localhost:2$${PREFIX}03/settings/connectors/enablebanking/callback,$${ENABLEBANKING_REDIRECT_URI_ALLOWLIST}" \
			>> .env; \
	fi; \
	if [ "$(telemetry)" = "axiom" ]; then \
		if [ -z "$${AXIOM_API_TOKEN}" ]; then \
			echo "$(RED)Error: AXIOM_API_TOKEN not found in $$SECRETS_FILE$(NC)"; \
			exit 1; \
		fi; \
		printf '\n%s\n%s\n%s\n' \
			"# Axiom telemetry" \
			"OTLP_AUTH_TOKEN=$${AXIOM_API_TOKEN}" \
			"AXIOM_DATASET=sverto-dev" \
			>> .env; \
	fi; \
	case "$(auth)" in \
		noauth|database) \
			printf '\n%s\n' "AUTH_PROVIDER=$(auth)" >> .env; \
			;; \
		clerk) \
			if [ -z "$$CLERK_PUBLISHABLE_KEY" ]; then \
				echo "$(RED)Error: CLERK_PUBLISHABLE_KEY not found in $$SECRETS_FILE$(NC)"; \
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
	case "$(secrets)" in \
		db) \
			printf '\n%s\n%s\n' \
				"SECRET_PROVIDER=local_encrypted" \
				"CONNECTOR_ENC_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" \
				>> .env; \
			;; \
		vault) \
			printf '\n%s\n%s\n' \
				"SECRET_PROVIDER=vault" \
				"VAULT_ADDR=http://localhost:2$${PREFIX}10" \
				>> .env; \
			;; \
		*) \
			echo "$(RED)Error: Unknown secrets provider '$(secrets)'. Use db or vault.$(NC)"; \
			exit 1; \
			;; \
	esac; \
	printf '\n%s\n%s\n%s\n%s\n%s\n' \
		"# Android signing" \
		"SVERTO_STORE_FILE=$${SVERTO_STORE_FILE}" \
		"SVERTO_STORE_PASSWORD=$${SVERTO_STORE_PASSWORD}" \
		"SVERTO_KEY_ALIAS=$${SVERTO_KEY_ALIAS}" \
		"SVERTO_KEY_PASSWORD=$${SVERTO_KEY_PASSWORD}" \
		>> .env; \
	printf '\n%s\n%s\n' \
		"# Android emulator" \
		"ANDROID_AVD_NAME=$${AVD_NAME}" \
		>> .env; \
	printf '\n%s\n' "APP_ENV=dev" >> .env; \
	echo "$(GREEN).env created (auth=$(auth), telemetry=$(telemetry), secrets=$(secrets)):$(NC)"; \
	cat .env
	@echo ""
	@echo "$(GREEN)Installing UI dependencies...$(NC)"
	cd web && bun install
	@echo "$(GREEN)Installing landing dependencies...$(NC)"
	cd landing && bun install
	@echo "$(GREEN)Building Rust workspace...$(NC)"
	cd server && cargo build
	@echo "$(GREEN)Setup complete!$(NC)"

# Status
.PHONY: status
status: ## Show service ports, status, and useful links
	@echo "$(GREEN)Auth Provider:$(NC)    $(YELLOW)$(AUTH_PROVIDER)$(NC)"
	@echo "$(GREEN)Secret Provider:$(NC)  $(YELLOW)$(SECRET_PROVIDER)$(NC)"
	@PROJ=$(basename $(pwd)); \
	if docker volume inspect $${PROJ}_myra-postgres-data >/dev/null 2>&1; then \
		echo "$(GREEN)Database Volume:$(NC)  $(GREEN)Yes$(NC)"; \
	else \
		echo "$(GREEN)Database Volume:$(NC)  $(RED)No$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)Links$(NC)"
	@echo "=================================="
	@echo "$(YELLOW)UI$(NC)              http://localhost:$(VITE_PORT)/"
	@echo "$(YELLOW)Landing$(NC)         http://localhost:$(LANDING_PORT)/"
	@echo "$(YELLOW)Redoc$(NC)           http://localhost:$(SERVER_PORT)/redoc"
	@echo "$(YELLOW)APIs$(NC)            http://localhost:$(SERVER_PORT)/api"
	@echo "$(YELLOW)Jaeger$(NC)          http://localhost:$(JAEGER_UI_PORT)/"
	@echo "$(YELLOW)Seq$(NC)             http://localhost:$(SEQ_PORT)/"
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
	check_worker() { \
		if [ -n "$(WORKER_PIDS)" ]; then \
			echo "$(YELLOW)Worker        $(NC)  (no port) - $(GREEN)Running$(NC)"; \
		else \
			echo "$(YELLOW)Worker        $(NC)  (no port) - $(RED)Not Running$(NC)"; \
		fi; \
	}; \
	check_emulator() { \
		SERIAL="$(AVD_SERIAL)"; \
		if [ -n "$$SERIAL" ]; then \
			echo "$(YELLOW)Emulator      $(NC)  $(ANDROID_AVD_NAME) ($$SERIAL) - $(GREEN)Running$(NC)"; \
		else \
			echo "$(YELLOW)Emulator      $(NC)  $(ANDROID_AVD_NAME) - $(RED)Not Running$(NC)"; \
		fi; \
	}; \
	check_infra "Postgres      " $(POSTGRES_PORT) database; \
	check_local "API Server    " $(SERVER_PORT); \
	check_worker; \
	check_local "Market Data   " $(MARKET_DATA_PORT); \
	check_local "Vite Dev      " $(VITE_PORT); \
	check_local "Landing Dev   " $(LANDING_PORT); \
	check_infra "OTLP Collector" $(OTLP_PORT) jaeger; \
	check_infra "Jaeger UI     " $(JAEGER_UI_PORT) jaeger; \
	check_infra "Seq Logs      " $(SEQ_PORT) seq; \
	check_infra "MinIO         " $(MINIO_PORT) minio; \
	check_infra "MinIO Console " $(MINIO_CONSOLE_PORT) minio; \
	check_infra "Redis         " $(REDIS_PORT) redis; \
	check_infra "Vault         " $(VAULT_PORT) vault; \
	check_emulator

# Run
.PHONY: backend-run
backend-run: ## Start API server (kills existing process on SERVER_PORT first)
	-@lsof -ti :$(SERVER_PORT) | xargs kill -9 2>/dev/null || true
	cd server && cargo run -p api --no-default-features --features $(AUTH_PROVIDER),seed

.PHONY: worker-run
worker-run: ## Start background worker (kills existing worker first). Shares this worktree's .env — no port needed.
	-@PIDS="$(WORKER_PIDS)"; [ -n "$$PIDS" ] && kill $$PIDS 2>/dev/null || true
	cd server && cargo run -p worker

.PHONY: market-data-run
market-data-run: ## Start market data API (kills existing process on MARKET_DATA_PORT first)
	-@lsof -ti :$(MARKET_DATA_PORT) | xargs kill -9 2>/dev/null || true
	cd market-data-api && cargo run

.PHONY: web-run
web-run: ## Start Vite dev server (kills existing process on VITE_PORT first)
	-@lsof -ti :$(VITE_PORT) | xargs kill -9 2>/dev/null || true
	cd web && bun run dev

.PHONY: landing-run
landing-run: ## Start Astro dev server for the marketing site (kills LANDING_PORT first; astro dev daemonises, stop it with "cd landing && bunx astro dev stop")
	-@lsof -ti :$(LANDING_PORT) | xargs kill -9 2>/dev/null || true
	cd landing && \
		PUBLIC_SITE_URL=http://localhost:$(LANDING_PORT) \
		PUBLIC_APP_URL=http://localhost:$(VITE_PORT) \
		bun run dev --port $(LANDING_PORT)

.PHONY: landing-build
landing-build: ## Build the static marketing site into landing/dist
	cd landing && \
		PUBLIC_SITE_URL=$(LANDING_SITE_URL) \
		PUBLIC_APP_URL=$(LANDING_APP_URL) \
		bun run build

.PHONY: ide
ide: ## Open VS Code and auto-start infra, backend, worker, market-data, web in split terminals
	@code .vscode/myra.code-workspace

.PHONY: android-emulator
android-emulator: ## Boot this worktree's Pixel 9 AVD, creating it on first use. reset=true recreates it from scratch (wipes its data)
	@test -n "$(ANDROID_AVD_NAME)" || { echo "$(RED)Error: ANDROID_AVD_NAME is not set. Run make setup-env first.$(NC)"; exit 1; }
	@SERIAL="$(AVD_SERIAL)"; \
	if [ "$(reset)" = "true" ] && [ -n "$$SERIAL" ]; then \
		echo "$(YELLOW)Stopping $(ANDROID_AVD_NAME) ($$SERIAL) for reset...$(NC)"; \
		$(ADB) -s "$$SERIAL" emu kill >/dev/null; \
		while $(ADB) devices | grep -qw "$$SERIAL"; do sleep 1; done; \
		SERIAL=""; \
	fi; \
	if [ -z "$$SERIAL" ]; then \
		if [ "$(reset)" = "true" ] || [ ! -d "$(AVD_DIR)" ]; then \
			if [ ! -d "$(ANDROID_SDK)/$(subst ;,/,$(ANDROID_SYSTEM_IMAGE))" ]; then \
				echo "$(GREEN)Installing $(ANDROID_SYSTEM_IMAGE)...$(NC)"; \
				yes | $(SDKMANAGER) --install "$(ANDROID_SYSTEM_IMAGE)"; \
			fi; \
			{ echo no | $(AVDMANAGER) create avd --force -n "$(ANDROID_AVD_NAME)" -k "$(ANDROID_SYSTEM_IMAGE)" -d pixel_9 --skin pixel_9 && \
			sed -i '' \
				-e 's/^PlayStore.enabled=.*/PlayStore.enabled=true/' \
				-e 's/^hw.keyboard=.*/hw.keyboard=yes/' \
				-e 's/^hw.gpu.enabled=.*/hw.gpu.enabled=yes/' \
				-e 's/^hw.camera.back=.*/hw.camera.back=virtualscene/' \
				-e 's/^hw.camera.front=.*/hw.camera.front=emulated/' \
				-e 's/^disk.dataPartition.size=.*/disk.dataPartition.size=20G/' \
				-e 's/^sdcard.size=.*/sdcard.size=6G/' \
				"$(AVD_DIR)/config.ini" && \
			printf '%s\n%s\n' "avd.ini.displayname=$(ANDROID_AVD_NAME)" "AvdId=$(ANDROID_AVD_NAME)" >> "$(AVD_DIR)/config.ini"; } || exit 1; \
			echo "$(GREEN)AVD $(ANDROID_AVD_NAME) created$(NC)"; \
		fi; \
		echo "$(GREEN)Booting $(ANDROID_AVD_NAME)...$(NC)"; \
		nohup $(EMULATOR) -avd "$(ANDROID_AVD_NAME)" </dev/null >"$(AVD_DIR)/emulator.log" 2>&1 & \
		i=0; \
		until SERIAL="$(AVD_SERIAL)"; [ -n "$$SERIAL" ]; do \
			i=$$((i + 1)); \
			if [ $$i -gt 60 ]; then echo "$(RED)Error: $(ANDROID_AVD_NAME) did not show up in adb within 60s, see $(AVD_DIR)/emulator.log$(NC)"; exit 1; fi; \
			sleep 1; \
		done; \
	fi; \
	i=0; \
	until [ "$$($(ADB) -s "$$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do \
		i=$$((i + 1)); \
		if [ $$i -gt 150 ]; then echo "$(RED)Error: $$SERIAL did not finish booting within 300s$(NC)"; exit 1; fi; \
		sleep 2; \
	done; \
	echo "$(GREEN)$(ANDROID_AVD_NAME) ready on $$SERIAL$(NC)"

.PHONY: android-run
android-run: android-emulator ## Build, install, and launch the dev Android app on this worktree's emulator (boots it if needed)
	@SERIAL="$(AVD_SERIAL)"; \
	cd android && ANDROID_SERIAL="$$SERIAL" ./gradlew installDevDebug && \
	$(ADB) -s "$$SERIAL" reverse tcp:$(SERVER_PORT) tcp:$(SERVER_PORT) >/dev/null && \
	$(ADB) -s "$$SERIAL" reverse tcp:$(MINIO_PORT) tcp:$(MINIO_PORT) >/dev/null && \
	echo "$(GREEN)Launching on $$SERIAL$(NC)" && \
	$(ADB) -s "$$SERIAL" shell am start -n com.sverto.app.dev/com.sverto.app.MainActivity

.PHONY: android-install-prod
android-install-prod: android-emulator ## Build and install the prod Android app on this worktree's emulator and any connected physical devices (points at api.sverto.com)
	@if [ ! -f ".secrets.prod" ]; then \
		echo "$(RED)Error: .secrets.prod not found.$(NC)"; \
		exit 1; \
	fi; \
	. ./.secrets.prod; \
	SERIALS="$(AVD_SERIAL)"; \
	for p in $(PHYSICAL_SERIALS); do SERIALS="$$SERIALS,$$p"; done; \
	echo "$(GREEN)Installing on: $$SERIALS$(NC)"; \
	cd android && ANDROID_SERIAL="$$SERIALS" ./gradlew installProdRelease \
		-PAPP_ENV=prod \
		-PAPP_API_BASE_URL=https://api.sverto.com \
		-PCLERK_PUBLISHABLE_KEY="$$CLERK_PUBLISHABLE_KEY" \
		-PSVERTO_STORE_FILE="$$SVERTO_STORE_FILE" \
		-PSVERTO_STORE_PASSWORD="$$SVERTO_STORE_PASSWORD" \
		-PSVERTO_KEY_ALIAS="$$SVERTO_KEY_ALIAS" \
		-PSVERTO_KEY_PASSWORD="$$SVERTO_KEY_PASSWORD"

.PHONY: android-bundle-prod
android-bundle-prod: ## Build the prod release App Bundle (AAB) for Google Play upload
	@if [ ! -f ".secrets.prod" ]; then \
		echo "$(RED)Error: .secrets.prod not found.$(NC)"; \
		exit 1; \
	fi; \
	. ./.secrets.prod; \
	cd android && ./gradlew bundleProdRelease \
		-PAPP_ENV=prod \
		-PAPP_API_BASE_URL=https://api.sverto.com \
		-PCLERK_PUBLISHABLE_KEY="$$CLERK_PUBLISHABLE_KEY" \
		-PSVERTO_STORE_FILE="$$SVERTO_STORE_FILE" \
		-PSVERTO_STORE_PASSWORD="$$SVERTO_STORE_PASSWORD" \
		-PSVERTO_KEY_ALIAS="$$SVERTO_KEY_ALIAS" \
		-PSVERTO_KEY_PASSWORD="$$SVERTO_KEY_PASSWORD"
	@echo "$(GREEN)AAB: android/app/build/outputs/bundle/prodRelease/app-prod-release.aab$(NC)"

# Infrastructure
.PHONY: start-infra
start-infra: ## Start infrastructure services (Postgres, Jaeger, etc.)
	docker-compose up -d

.PHONY: refresh-infra
refresh-infra: ## Wipe volumes and restart infrastructure services
	docker-compose down -v
	docker-compose up -d

.PHONY: _stop-processes
_stop-processes:
	@echo "$(YELLOW)Stopping local processes...$(NC)"
	-@lsof -ti :$(SERVER_PORT) | xargs kill -9 2>/dev/null || true
	-@lsof -ti :$(MARKET_DATA_PORT) | xargs kill -9 2>/dev/null || true
	-@lsof -ti :$(VITE_PORT) | xargs kill -9 2>/dev/null || true
	-@lsof -ti :$(LANDING_PORT) | xargs kill -9 2>/dev/null || true
	-@PIDS="$(WORKER_PIDS)"; [ -n "$$PIDS" ] && kill -9 $$PIDS 2>/dev/null || true

.PHONY: stop
stop: _stop-processes ## Stop all dev processes and docker containers (keeps volumes)
	@echo "$(YELLOW)Stopping docker containers...$(NC)"
	docker-compose down

.PHONY: destroy
destroy: _stop-processes ## Stop all dev processes and docker containers, AND delete volumes
	@echo "$(YELLOW)Stopping docker containers and deleting volumes...$(NC)"
	docker-compose down -v

# Database
.PHONY: export-db
export-db: ## Export database data to db_dump.sql
	@echo "$(GREEN)Exporting database data...$(NC)"
	@PGPASSWORD=$(POSTGRES_PASSWORD) pg_dump -h localhost -p $(POSTGRES_PORT) -U $(POSTGRES_USER) -d $(POSTGRES_DB) --data-only --exclude-table='_sqlx_*' --disable-triggers > db_dump.sql
	@echo "$(GREEN)Database data exported to db_dump.sql$(NC)"

.PHONY: seed-demo
seed-demo: ## Load the demo/showcase dataset for the default user (idempotent; needs DB running)
	@echo "$(GREEN)Seeding demo showcase data...$(NC)"
	@PGPASSWORD=$(POSTGRES_PASSWORD) psql -h localhost -p $(POSTGRES_PORT) -U $(POSTGRES_USER) -d $(POSTGRES_DB) -v ON_ERROR_STOP=1 -q -f database/demo/showcase_data.sql
	@echo "$(GREEN)Demo data loaded. Run 'make worker-run' so investment prices populate from market data.$(NC)"

.PHONY: import-db
import-db: ## Import database data from db_dump.sql (truncates existing data first)
	@echo "$(YELLOW)Truncating existing data...$(NC)"
	@PGPASSWORD=$(POSTGRES_PASSWORD) psql -h localhost -p $(POSTGRES_PORT) -U $(POSTGRES_USER) -d $(POSTGRES_DB) -c \
		"DO \$$\$$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_sqlx_%') LOOP EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END \$$\$$;"
	@echo "$(GREEN)Importing database data...$(NC)"
	@PGPASSWORD=$(POSTGRES_PASSWORD) psql -h localhost -p $(POSTGRES_PORT) -U $(POSTGRES_USER) -d $(POSTGRES_DB) < db_dump.sql
	@echo "$(GREEN)Database data imported from db_dump.sql$(NC)"

# API Generation
.PHONY: generate-api
generate-api: ## Generate TypeScript API client from OpenAPI spec
	@echo "$(GREEN)Compiling and generating OpenAPI spec...$(NC)"
	@TEMP_FILE=$$(mktemp /tmp/openapi.XXXXXX.json); \
	if (cd server && cargo run -p api --no-default-features --features database -- --openapi) > $$TEMP_FILE 2>/dev/null; then \
		echo "$(GREEN)OpenAPI spec generated successfully$(NC)"; \
		echo "$(YELLOW)Converting anyOf to oneOf...$(NC)"; \
		sed -i '' 's/"anyOf"/"oneOf"/g' $$TEMP_FILE; \
		echo "$(GREEN)Generating API client...$(NC)"; \
		cd web; \
		bunx @openapitools/openapi-generator-cli generate -i $$TEMP_FILE -g typescript-axios --skip-validate-spec -o src/api --additional-properties=withInterfaces=true,legacyDiscriminatorBehavior=true,supportsES6=true; \
		echo "$(YELLOW)Cleaning up generated files...$(NC)"; \
		rm -rf src/api/docs src/api/.openapi-generator src/api/.gitignore src/api/.npmignore src/api/.openapi-generator-ignore src/api/git_push.sh; \
		sed -i '' '/^\/\* eslint-disable \*\/$$/d' src/api/index.ts; \
		sed -i '' '1s/^/\/\/ @ts-nocheck\n/' src/api/api.ts; \
		echo "$(YELLOW)Removing temporary file...$(NC)"; \
		rm -f $$TEMP_FILE; \
		echo "$(YELLOW)Formatting generated files...$(NC)"; \
		bunx prettier --write "src/api/**/*.ts"; \
		echo "$(GREEN)API client generated successfully!$(NC)"; \
	else \
		echo "$(RED)Error: Failed to generate OpenAPI spec. Check Rust compilation errors:$(NC)"; \
		(cd server && cargo run -p api --no-default-features --features database -- --openapi) 2>&1 || true; \
		rm -f $$TEMP_FILE; \
		exit 1; \
	fi
