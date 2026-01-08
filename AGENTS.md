## Project Overview

**Appliqué** is an agent-driven job application document generator that transforms job posting URLs into personalized CVs and cover letters. It uses a multi-step agentic pipeline with structured extraction, validation, and LaTeX rendering to produce professional PDF application packages.

## Development Commands

### Core Development Tasks

- **Setup environment**: `make setup` (requires uv, bun, docker)
- **Run development servers**: `make dev` (starts both backend on :8000 and frontend on :8080)
- **Run backend only**: `make backend`
- **Run frontend only**: `make frontend`
- **Run all checks**: `make check` (linter, formatter, type checker)
- **Run tests**: `make test`
- **View all commands**: `make help`

### Backend-Specific Commands

- **Install dependencies**: `cd backend && uv sync --all-groups`
- **Run server**: `cd backend && uv run python -m applique_backend.app --log-config logging.yml --reload`
- **Type checking**: `cd backend && uv run ty check applique_backend/`
- **Linting**: `cd backend && uv run ruff check applique_backend/`
- **Format code**: `cd backend && uv run ruff format applique_backend/`
- **Run specific test**: `cd backend && uv run pytest tests/test_file.py::test_function_name -v`
- **Run with debug**: `cd backend && uv run pytest tests/test_file.py -v -s`
- **Coverage report**: `make coverage` (generates HTML report at backend/htmlcov/index.html)

### Frontend-Specific Commands

- **Install dependencies**: `cd frontend && bun install`
- **Run dev server**: `cd frontend && bun run dev` (port 8080)
- **Build production**: `cd frontend && bun run build`
- **Type checking**: `cd frontend && bun run typecheck`
- **Linting**: `cd frontend && bun run lint`
- **Format code**: `cd frontend && bun run format`

### Database Commands

- **Apply migrations**: `make migrate` or `cd backend && uv run alembic upgrade head`
- **Create migration**: `make migration-gen MSG="description"` or `cd backend && uv run alembic revision --autogenerate -m "description"`
- **Rollback migration**: `make migration-downgrade` (WARNING: destructive)
- **Check migration status**: `make migration-check` or `cd backend && uv run alembic current`

### Docker Commands

- **Build images**: `make docker-build`
- **Start containers**: `make docker-up` (frontend on :8080, backend on :8000)
- **Start with observability**: `make docker-obs-up` (includes Grafana LGTM stack)
- **View logs**: `make docker-logs`
- **Stop containers**: `make docker-down`
- **Clean Docker**: `make clean-docker`

### Documentation

- **Build docs**: `make docs` or `cd backend && uv run mkdocs build --strict`
- **Serve docs locally**: `make docs-serve` or `cd backend && uv run mkdocs serve --strict --dev-addr localhost:8888`

## Project Architecture

### Directory Structure

```
applique/
├── backend/                      # FastAPI Python backend
│   ├── applique_backend/
│   │   ├── api/                 # REST API layer
│   │   │   ├── routes/          # Route handlers (llm.py, documents.py, chat.py, prompts.py)
│   │   │   ├── schemas.py       # Pydantic request/response models
│   │   │   ├── deps.py          # Dependency injection (DB session, etc.)
│   │   │   └── router.py        # Main router configuration
│   │   ├── core/                # Core functionality
│   │   │   ├── settings.py      # Pydantic Settings configuration
│   │   │   ├── telemetry.py     # OpenTelemetry setup
│   │   │   └── exceptions.py    # Custom exceptions
│   │   ├── db/                  # Database layer
│   │   │   ├── models.py        # SQLAlchemy ORM models
│   │   │   ├── crud.py          # CRUD operations (async)
│   │   │   └── core.py          # Database engine, session factory
│   │   ├── services/            # Business logic
│   │   │   ├── llm.py           # LLM provider abstraction (Pydantic-AI)
│   │   │   ├── extraction.py    # Job posting metadata extraction
│   │   │   ├── document_service.py  # LaTeX template management and PDF generation
│   │   │   └── prompts/         # Prompt templates
│   │   ├── alembic/             # Database migrations
│   │   │   └── versions/        # Migration scripts
│   │   └── app.py               # FastAPI application factory
│   ├── tests/                   # Backend tests
│   ├── pyproject.toml           # Python dependencies (uv)
│   ├── uv.lock                  # Locked dependencies
│   ├── alembic.ini              # Alembic configuration
│   └── logging.yml              # Logging configuration
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── routes/              # TanStack Router pages (file-based routing)
│   │   │   ├── __root.tsx       # Root layout
│   │   │   ├── index.tsx        # Dashboard
│   │   │   ├── postings.tsx     # Job postings management
│   │   │   ├── documents.tsx    # Document templates
│   │   │   ├── llm.tsx          # LLM configuration
│   │   │   └── chat.tsx         # Chat interface
│   │   ├── components/          # React components
│   │   │   ├── ui/              # shadcn/ui components (Button, Dialog, Card, etc.)
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── lib/                 # Utilities
│   │   │   ├── api.ts           # API client (grouped by domain)
│   │   │   ├── types.ts         # TypeScript types (match backend schemas)
│   │   │   └── utils.ts         # Helper functions
│   │   ├── main.tsx             # Application entry point
│   │   └── styles.css           # Global styles (Tailwind)
│   ├── package.json             # npm dependencies (bun)
│   ├── bun.lock                 # Locked dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   ├── vite.config.ts           # Vite build configuration
│   └── biome.jsonc              # Biome linter/formatter configuration
├── data/                         # Application data (SQLite DB, documents)
├── output/                       # Generated PDFs
├── scripts/                      # Utility scripts
├── compose.yml                   # Docker Compose configuration
├── compose.observability.yml  	  # Observability stack (Grafana LGTM)
├── Makefile                      # Development task automation
└── README.md                     # Project documentation
```

### Technology Stack

**Backend:**
- **Runtime**: Python 3.14 (managed via [uv](https://docs.astral.sh/uv/))
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (async)
- **Database**: SQLite with [SQLAlchemy 2.x](https://www.sqlalchemy.org/) (async via aiosqlite)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/)
- **LLM Integration**: [Pydantic-AI](https://pydantic-ai.com/) (supports OpenAI, Anthropic, Google, Groq, Cohere, Mistral, OpenRouter)
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Document Generation**: LaTeX (pdflatex)
- **Web Scraping**: [Playwright](https://playwright.dev/) + [Trafilatura](https://trafilatura.readthedocs.io/)
- **Observability**: [OpenTelemetry](https://opentelemetry.io/)

**Frontend:**
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [React 19](https://react.dev/)
- **Router**: [TanStack Router](https://tanstack.com/router) (file-based routing)
- **State Management**: [TanStack Query](https://tanstack.com/query)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) patterns
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Linter/Formatter**: [Biome](https://biomejs.dev/)
- **Language**: TypeScript

### Core Components

**Agent Pipeline (`backend/applique_backend/services/`)**
- Multi-step agentic workflow: Retrieve → Extract → Match → Draft → Verify → Render
- `extraction.py`: Structured metadata extraction from job postings using Pydantic-AI agents
- `llm.py`: LLM provider abstraction and model management
- `document_service.py`: LaTeX template management and PDF generation

**Database Models (`backend/applique_backend/db/models.py`)**
- `LLMConfiguration`: LLM provider settings (one active at a time)
- `JobPosting`: Scraped job descriptions with extracted metadata
  - `full_content`: Raw job description text
  - `generated_metadata`: JSON with company_name, job_title, recipient_name, city, zip_code, street_address, etc.
  - `extraction_status`: pending | processing | completed | failed
- `GenerationHistory`: Track generated PDF documents

**API Structure (`backend/applique_backend/api/routes/`)**
- `/api/status` - Dashboard statistics
- `/api/llm/` - LLM configuration management
- `/api/postings/` - Job posting CRUD and metadata extraction
- `/api/documents/` - LaTeX template management and PDF generation
- `/api/prompts/` - Prompt template management
- `/api/chat/` - Agent UI chat interface

## Code Style Rules

### Backend (Python)

**Required:**
- Use type hints for ALL function signatures and class attributes
- Use Pydantic v2 syntax (`model_validate`, `ConfigDict`, `model_dump`, `Field`)
- Use SQLAlchemy 2.x `mapped_column` syntax, **NOT** `Column()`
- Use async/await for all database and I/O operations
- Use `Annotated[AsyncSession, Depends(get_db)]` for DB dependencies
- Use `from typing import TYPE_CHECKING` for forward references

**Patterns:**
- API schemas: `applique_backend/api/schemas.py` (Pydantic `BaseModel`)
- Database models: `applique_backend/db/models.py` (SQLAlchemy `mapped_column`)
- CRUD operations: `applique_backend/db/crud.py` (async functions)
- Route handlers: `applique_backend/api/routes/` (return Pydantic models)
- Business logic: `applique_backend/services/` (async service layer)

### Frontend (TypeScript)

**Required:**
- Use TypeScript strictly (avoid `any` unless necessary)
- Import types with `import type { Type } from ...`
- Use TanStack Query for all API calls (`useQuery`, `useMutation`)
- Use TanStack Router file-based routing (`createFileRoute`)
- Use Biome for linting and formatting
- Components in PascalCase, files in kebab-case

**Patterns:**
- API client: `src/lib/api.ts` (grouped by domain: `llmApi`, `postingsApi`, etc.)
- Types: `src/lib/types.ts` (mirror backend Pydantic schemas)
- Routes: `src/routes/*.tsx` (use `createFileRoute`)
- UI components: `src/components/ui/` (shadcn/ui style)
- Custom components: `src/components/` (domain-specific)

## Additional Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Pydantic Documentation**: https://docs.pydantic.dev/
- **Pydantic-AI Documentation**: https://pydantic-ai.com/
- **SQLAlchemy 2.x Documentation**: https://docs.sqlalchemy.org/
- **TanStack Router**: https://tanstack.com/router
- **TanStack Query**: https://tanstack.com/query
- **shadcn/ui**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/
