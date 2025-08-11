# Myra Personal Finance - Rust Backend Makefile
# ================================================

# Variables
RUST_LOG ?= debug
SERVER_PORT ?= 5000
API_PORT ?= $(SERVER_PORT)
DATABASE_URL ?= postgres://myradev:devpassword@localhost:5432/myra
CARGO_CMD = cargo
DOCKER_COMPOSE = docker-compose

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Default target
.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)Myra Backend - Available Commands$(NC)"
	@echo "=================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

# Development Environment
.PHONY: dev-setup
dev-setup: ## Setup development environment (start infrastructure)
	@echo "$(GREEN)Starting development infrastructure...$(NC)"
	$(DOCKER_COMPOSE) up -d

.PHONY: dev-down
dev-down: ## Stop development infrastructure
	@echo "$(YELLOW)Stopping development infrastructure...$(NC)"
	$(DOCKER_COMPOSE) down

.PHONY: dev-clean
dev-clean: ## Clean development environment (remove volumes)
	@echo "$(RED)Cleaning development environment...$(NC)"
	$(DOCKER_COMPOSE) down -v
	docker system prune -f

# Building
.PHONY: build
build: ## Build all workspace crates
	@echo "$(GREEN)Building all workspace crates...$(NC)"
	cd server && $(CARGO_CMD) build

.PHONY: build-release
build-release: ## Build all workspace crates in release mode
	@echo "$(GREEN)Building all workspace crates (release)...$(NC)"
	cd server && $(CARGO_CMD) build --release

.PHONY: build-api
build-api: ## Build API crate only
	@echo "$(GREEN)Building API crate...$(NC)"
	cd server && $(CARGO_CMD) build -p api

.PHONY: build-cli
build-cli: ## Build CLI crate only
	@echo "$(GREEN)Building CLI crate...$(NC)"
	cd server && $(CARGO_CMD) build -p cli

# Running
.PHONY: run-api
run-api: ## Run the API server (usage: make run-api [PORT=5001])
	@echo "$(GREEN)Starting API server on port $(if $(PORT),$(PORT),$(API_PORT))...$(NC)"
	cd server && SERVER_PORT=$(if $(PORT),$(PORT),$(API_PORT)) RUST_LOG=$(RUST_LOG) $(CARGO_CMD) run --bin api

.PHONY: run-cli
run-cli: ## Run the CLI tool
	@echo "$(GREEN)Running CLI tool...$(NC)"
	cd server && $(CARGO_CMD) run --bin cli

# Code Quality
.PHONY: fmt
fmt: ## Format all code
	@echo "$(GREEN)Formatting code...$(NC)"
	cd server && $(CARGO_CMD) fmt

.PHONY: fmt-check
fmt-check: ## Check code formatting
	@echo "$(GREEN)Checking code formatting...$(NC)"
	cd server && $(CARGO_CMD) fmt --check

.PHONY: clippy
clippy: ## Run clippy lints
	@echo "$(GREEN)Running clippy...$(NC)"
	cd server && $(CARGO_CMD) clippy --all-targets --all-features -- -D warnings

.PHONY: clippy-fix
clippy-fix: ## Apply clippy suggestions
	@echo "$(GREEN)Applying clippy fixes...$(NC)"
	cd server && $(CARGO_CMD) clippy --fix --allow-dirty --allow-staged

.PHONY: check
check: ## Type check all code
	@echo "$(GREEN)Type checking...$(NC)"
	cd server && $(CARGO_CMD) check --all-targets --all-features

.PHONY: audit
audit: ## Security audit
	@echo "$(GREEN)Running security audit...$(NC)"
	cd server && $(CARGO_CMD) audit

# Testing
.PHONY: test
test: ## Run all tests
	@echo "$(GREEN)Running tests...$(NC)"
	cd server && $(CARGO_CMD) test

.PHONY: test-verbose
test-verbose: ## Run tests with verbose output
	@echo "$(GREEN)Running tests (verbose)...$(NC)"
	cd server && $(CARGO_CMD) test -- --nocapture

.PHONY: test-api
test-api: ## Run API tests only
	@echo "$(GREEN)Running API tests...$(NC)"
	cd server && $(CARGO_CMD) test -p api

.PHONY: test-business
test-business: ## Run business logic tests only
	@echo "$(GREEN)Running business tests...$(NC)"
	cd server && $(CARGO_CMD) test -p business

.PHONY: test-dal
test-dal: ## Run data access layer tests only
	@echo "$(GREEN)Running DAL tests...$(NC)"
	cd server && $(CARGO_CMD) test -p dal

# Documentation
.PHONY: doc
doc: ## Generate documentation
	@echo "$(GREEN)Generating documentation...$(NC)"
	cd server && $(CARGO_CMD) doc --no-deps --open

.PHONY: doc-all
doc-all: ## Generate documentation with dependencies
	@echo "$(GREEN)Generating documentation (with dependencies)...$(NC)"
	cd server && $(CARGO_CMD) doc --open

# Dependencies
.PHONY: update
update: ## Update dependencies
	@echo "$(GREEN)Updating dependencies...$(NC)"
	cd server && $(CARGO_CMD) update

.PHONY: outdated
outdated: ## Check for outdated dependencies
	@echo "$(GREEN)Checking for outdated dependencies...$(NC)"
	cd server && $(CARGO_CMD) outdated

.PHONY: tree
tree: ## Show dependency tree
	@echo "$(GREEN)Showing dependency tree...$(NC)"
	cd server && $(CARGO_CMD) tree

# Maintenance
.PHONY: clean
clean: ## Clean build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	cd server && $(CARGO_CMD) clean

.PHONY: clean-full
clean-full: clean ## Clean everything including dev environment
	@echo "$(RED)Full cleanup...$(NC)"
	$(MAKE) dev-clean

# Database Operations
.PHONY: db-migrate
db-migrate: ## Run database migrations (via docker-compose)
	@echo "$(GREEN)Running database migrations...$(NC)"
	$(DOCKER_COMPOSE) up flyway

.PHONY: db-seed
db-seed: ## Seed database with test data
	@echo "$(GREEN)Seeding database...$(NC)"
	@echo "$(YELLOW)Note: Seed data should be applied via Flyway migrations$(NC)"

.PHONY: db-reset
db-reset: ## Reset database (drop and recreate)
	@echo "$(RED)Resetting database...$(NC)"
	$(DOCKER_COMPOSE) down postgres
	docker volume rm myra_postgres_data 2>/dev/null || true
	$(DOCKER_COMPOSE) up -d postgres
	@echo "$(YELLOW)Waiting for database to be ready...$(NC)"
	sleep 5
	$(MAKE) db-migrate

# All-in-one commands
.PHONY: qa
qa: fmt clippy test ## Run all quality assurance checks
	@echo "$(GREEN)All QA checks completed!$(NC)"

.PHONY: ci
ci: fmt-check clippy test ## Run CI pipeline locally
	@echo "$(GREEN)CI pipeline completed!$(NC)"

.PHONY: dev
dev: dev-setup run-api ## Start dev environment and API server

.PHONY: fresh-start
fresh-start: clean dev-clean dev-setup build ## Complete fresh start
	@echo "$(GREEN)Fresh development environment ready!$(NC)"

# Utility targets
.PHONY: logs
logs: ## Show docker-compose logs
	$(DOCKER_COMPOSE) logs -f

.PHONY: ps
ps: ## Show running containers
	$(DOCKER_COMPOSE) ps

.PHONY: status
status: ## Show project status
	@echo "$(GREEN)=== Project Status ===$(NC)"
	@echo "Docker containers:"
	@$(DOCKER_COMPOSE) ps
	@echo "\nDatabase connection:"
	@cd server && $(CARGO_CMD) run --bin cli -- --help 2>/dev/null || echo "CLI not available"
	@echo "\nLast git commit:"
	@git log -1 --oneline 2>/dev/null || echo "Not a git repository"

# IDE Support
.PHONY: rust-analyzer
rust-analyzer: ## Generate rust-analyzer configuration
	@echo "$(GREEN)Setting up rust-analyzer...$(NC)"
	cd server && $(CARGO_CMD) check

# Benchmark (if needed in future)
.PHONY: bench
bench: ## Run benchmarks
	@echo "$(GREEN)Running benchmarks...$(NC)"
	cd server && $(CARGO_CMD) bench

# Install tools
.PHONY: install-tools
install-tools: ## Install development tools
	@echo "$(GREEN)Installing development tools...$(NC)"
	$(CARGO_CMD) install cargo-audit cargo-outdated cargo-tree

# Quick commands for common workflows
.PHONY: quick-test
quick-test: fmt clippy ## Quick test (format + clippy, no tests)
	@echo "$(GREEN)Quick validation completed!$(NC)"

.PHONY: full-test
full-test: qa doc ## Full test suite including documentation
	@echo "$(GREEN)Full test suite completed!$(NC)"