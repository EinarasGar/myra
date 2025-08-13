# Myra Personal Finance - Frontend Makefile
# ============================================

# Variables
PACKAGE_MANAGER = bun
DEV_PORT ?= 5173
BUILD_DIR = dist
NODE_ENV ?= development

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Default target
.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)Myra Frontend - Available Commands$(NC)"
	@echo "=================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

# Development Commands
.PHONY: run
run: dev ## Start development server (alias for dev)

.PHONY: dev
dev: ## Start development server with hot reload
	@echo "$(GREEN)Starting development server on port $(DEV_PORT)...$(NC)"
	@$(PACKAGE_MANAGER) run dev

.PHONY: build
build: ## Build for production
	@echo "$(GREEN)Building for production...$(NC)"
	@$(PACKAGE_MANAGER) run build

.PHONY: preview
preview: ## Preview production build
	@echo "$(GREEN)Previewing production build...$(NC)"
	@$(PACKAGE_MANAGER) run preview

# Package Management
.PHONY: install
install: ## Install dependencies
	@echo "$(GREEN)Installing dependencies...$(NC)"
	@$(PACKAGE_MANAGER) install

.PHONY: update
update: ## Update all packages to latest versions
	@echo "$(GREEN)Updating packages...$(NC)"
	@$(PACKAGE_MANAGER) update

.PHONY: outdated
outdated: ## Check for outdated dependencies
	@echo "$(GREEN)Checking for outdated dependencies...$(NC)"
	@$(PACKAGE_MANAGER) outdated

# Code Quality
.PHONY: lint
lint: ## Run ESLint
	@echo "$(GREEN)Running ESLint...$(NC)"
	@$(PACKAGE_MANAGER) run lint

.PHONY: lint-fix
lint-fix: ## Fix ESLint issues automatically
	@echo "$(GREEN)Fixing ESLint issues...$(NC)"
	@$(PACKAGE_MANAGER) run lint --fix

.PHONY: type-check
type-check: ## Type check without emitting files
	@echo "$(GREEN)Type checking...$(NC)"
	@npx tsc --noEmit

.PHONY: format
format: ## Format code with prettier
	@echo "$(GREEN)Formatting code...$(NC)"
	@bunx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,md}"

.PHONY: format-check
format-check: ## Check code formatting
	@echo "$(GREEN)Checking code formatting...$(NC)"
	@bunx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}"

# Maintenance
.PHONY: clean
clean: ## Clean build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@rm -rf $(BUILD_DIR) node_modules/.cache .vite

.PHONY: clean-full
clean-full: clean ## Clean everything including dependencies
	@echo "$(RED)Full cleanup...$(NC)"
	@rm -rf node_modules bun.lock package-lock.json

.PHONY: reset
reset: clean-full install ## Clean and reinstall dependencies
	@echo "$(GREEN)Reset complete!$(NC)"

# All-in-one commands
.PHONY: qa
qa: lint type-check ## Run all quality assurance checks
	@echo "$(GREEN)All QA checks completed!$(NC)"

.PHONY: ci
ci: format-check lint type-check build ## Run CI pipeline locally
	@echo "$(GREEN)CI pipeline completed!$(NC)"

.PHONY: fresh-start
fresh-start: clean-full install build ## Complete fresh start
	@echo "$(GREEN)Fresh development environment ready!$(NC)"

# Quick commands for common workflows
.PHONY: quick-check
quick-check: lint type-check ## Quick check (lint + type check)
	@echo "$(GREEN)Quick validation completed!$(NC)"

.PHONY: full-check
full-check: qa build ## Full check including build
	@echo "$(GREEN)Full validation completed!$(NC)"