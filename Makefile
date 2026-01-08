.DEFAULT_GOAL 	    = help
CVS_DIR				?= data/cvs
COVER_LETTERS_DIR	?= data/cover_letters
CV					?= cv.example.tex
COVER_LETTER		?= cover_letter.example.tex
BROWSER				?= $(shell command -v xdg-open 2>/dev/null || command -v open 2>/dev/null)

.PHONY: help
help: ## this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup

.PHONY: validate-env
validate-env:
	@command -v uv >/dev/null 2>&1 || { echo "ERROR: uv not found. Install: https://docs.astral.sh/uv/getting-started/installation/"; exit 1; }
	@command -v bun >/dev/null 2>&1 || { echo "ERROR: bun not found. Install: https://bun.sh/"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "ERROR: docker not found. Install: https://docker.com/"; exit 1; }

.PHONY: setup
setup: validate-env ## setup dev environment
	cd backend && uv sync --all-groups && uv run playwright install --with-deps chromium
	cd frontend && bun install

##@ Run Application

.PHONY: dev
dev: ## run applique frontend & backend in development mode
	@bash scripts/dev_servers.sh

.PHONY: backend
backend: ## run backend in development mode
	cd backend && uv run python -m applique_backend.app --log-config logging.yml --reload

.PHONY: frontend
frontend: ## run frontend in development mode
	cd frontend && bun run dev

.PHONY: start
start: ## run applique frontend & backend in production mode
	cd frontend && bun run build
	@trap 'kill 0' EXIT; \
	cd backend && uv run python -m applique_backend.app --log-config logging.yml & \
	cd frontend && bun run preview & \
	wait

##@ Development

.PHONY: format
format: ## format code
	cd backend && uv run ruff format
	cd frontend && bun run format

.PHONY: lint
lint: ## check code
	cd backend && uv run ruff check --fix
	cd frontend && bun run lint

.PHONY: typing
typing: ## run type checker
	cd backend && uv run ty check
	cd frontend && bun run typecheck

.PHONY: check
check: lint format typing ## run linter, formatter and type checker

.PHONY: test
test: ## run tests
	cd backend && uv run pytest -v

.PHONY: coverage
coverage: ## run unittests with pytest with coverage and show coverage report
	cd backend && uv run coverage run -m pytest
	cd backend && uv run coverage html -i --title "Appliqué Backend Code Coverage"
	@echo "Coverage report generated at backend/htmlcov/index.html"
	@if [ -n "$(BROWSER)" ]; then $(BROWSER) backend/htmlcv/index.html; fi

.PHONY: frontend-build
frontend-build: ## build frontend for production
	cd frontend && bun run build

.PHONY: frontend-lint
frontend-lint: ## lint frontend code
	cd frontend && bun run lint

##@ Database

.PHONY: migrate
migrate: ## run database migrations
	cd backend && uv run alembic upgrade head

.PHONY: migration-gen
migration-gen: ## generate database migrations (requires MSG="description")
	@test -n "$(MSG)" || { echo "ERROR: MSG required. Usage: make migration-gen MSG='description'"; exit 1; }
	cd backend && uv run alembic revision --autogenerate -m "$(MSG)"

.PHONY: migration-downgrade
migration-downgrade: ## downgrade database migrations (WARNING: destructive)
	@echo "WARNING: This will rollback the last migration. Continue? [y/N] " && read ans && [ $${ans:-N} = y ]
	cd backend && uv run alembic downgrade -1

.PHONY: migration-check
migration-check: ## check database migrations
	cd backend && uv run alembic check

##@ Documentation

.PHONY: docs
docs: ## build documentation
	cd backend && uv run mkdocs build --strict

.PHONY: docs-serve
docs-serve: ## serve documentation
	cd backend && uv run mkdocs serve --strict --dev-addr localhost:8888

##@ Docker

.PHONY: docker-build
docker-build: ## build docker images
	docker compose build

.PHONY: docker-up
docker-up: docker-build ## run application with docker
	docker compose up -d

.PHONY: docker-down
docker-down: ## stop application with docker
	docker compose down

.PHONY: docker-logs
docker-logs: ## show docker logs
	docker compose logs -f

.PHONY: docker-obs-up
docker-obs-up: ## run application with docker and observability stack
	docker compose -f compose.yml -f compose.observability.yml build
	docker compose -f compose.yml -f compose.observability.yml up -d

.PHONY: docker-obs-down
docker-obs-down: ## stop application and observability stack
	docker compose -f compose.yml -f compose.observability.yml down

##@ Cleanup

.PHONY: clean
clean: ## remove generated files
	rm -rf output/*.pdf backend/htmlcov backend/.pytest_cache backend/.ruff_cache

.PHONY: clean-all
clean-all: clean ## remove all build artifacts and caches
	cd backend && uv clean
	cd frontend && rm -rf dist node_modules/.cache

.PHONY: clean-docker
clean-docker: ## remove docker containers and images
	docker compose down -v --remove-orphans
	docker compose -f compose.yml -f compose.observability.yml down -v --remove-orphans

##@ LaTeX Document Generation

.PHONY: cv
cv: ## generate cv pdf
	pdflatex -interaction=nonstopmode -output-directory=output $(CVS_DIR)/$(CV)
	@echo "Generated output/$(CV:.tex=.pdf)"
	@if [ -n "$(BROWSER)" ]; then $(BROWSER) output/$(CV:.tex=.pdf); fi

.PHONY: cover-letter
cover-letter: ## generate cover letter pdf
	pdflatex -interaction=nonstopmode -output-directory=output $(COVER_LETTERS_DIR)/$(COVER_LETTER)
	@echo "Generated output/$(COVER_LETTER:.tex=.pdf)"
	@if [ -n "$(BROWSER)" ]; then $(BROWSER) output/$(COVER_LETTER:.tex=.pdf); fi
