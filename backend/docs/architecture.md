# Architecture

Appliqué is a full-stack application with a React frontend, FastAPI backend, and agent-driven document generation pipeline.

## System Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Frontend  │ ◄─────► │  Backend API │ ◄─────► │  Agent Pipeline │
│   (React)   │  REST   │   (FastAPI)  │         │  (Pydantic-AI)  │
└─────────────┘         └──────────────┘         └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌──────────────┐         ┌──────────────┐
                        │   Database   │         │   LaTeX      │
                        │   (SQLite)   │         │   Renderer   │
                        └──────────────┘         └──────────────┘
```

**Tech Stack**:
- **Frontend**: React 19 + TanStack Router + TanStack Query
- **Backend**: FastAPI + SQLAlchemy 2.x + Pydantic v2
- **Agents**: Pydantic-AI (supports multiple LLM providers)
- **Database**: SQLite (async via aiosqlite)
- **Documents**: LaTeX (pdflatex)

---

## Frontend Architecture

**Framework**: React 19 with TypeScript

**Key Technologies**:
- **TanStack Router**: File-based routing (`src/routes/*.tsx`)
- **TanStack Query**: Server state management and API caching
- **shadcn/ui**: UI components built on Radix UI
- **Tailwind CSS v4**: Styling

**Structure**:
```
frontend/src/
├── routes/          # Pages (file-based routing)
│   ├── index.tsx    # Dashboard
│   ├── postings.tsx # Job postings management
│   ├── documents.tsx # Template management
│   ├── llm.tsx      # LLM configuration
│   └── chat.tsx     # Chat interface
├── components/      # React components
│   ├── ui/          # shadcn/ui components
│   └── *.tsx        # Custom components
└── lib/
    ├── api.ts       # API client (grouped by domain)
    └── types.ts     # TypeScript types
```

**API Integration**:
- Grouped API calls by domain: `llmApi`, `postingsApi`, `documentsApi`
- TanStack Query for caching and optimistic updates
- Type-safe requests/responses matching backend schemas

---

## Backend Architecture

**Framework**: FastAPI (async)

**Layered Structure**:
```
backend/applique_backend/
├── api/             # REST API layer
│   ├── routes/      # Endpoint handlers
│   ├── schemas.py   # Pydantic request/response models
│   └── deps.py      # Dependency injection
├── services/        # Business logic
│   ├── llm.py       # LLM provider abstraction
│   ├── extraction.py # Metadata extraction agent
│   └── document_service.py # PDF generation
├── db/              # Database layer
│   ├── models.py    # SQLAlchemy ORM models
│   └── crud.py      # CRUD operations
└── core/
    ├── settings.py  # Configuration
    └── telemetry.py # OpenTelemetry
```

**API Endpoints**:
- `/api/status` - Dashboard statistics
- `/api/llm/` - LLM configuration management
- `/api/postings/` - Job posting CRUD and extraction
- `/api/documents/` - Template management and PDF generation
- `/api/prompts/` - Prompt template management
- `/api/chat/` - Chat interface

---

## Agent Pipeline

The core of Appliqué is a multi-step agentic workflow that processes job postings into personalized applications.

**Pipeline Steps**:

```
┌────────────┐    ┌──────────┐    ┌───────┐    ┌───────┐    ┌────────┐    ┌────────┐
│  Retrieve  │ -> │ Extract  │ -> │ Match │ -> │ Draft │ -> │ Verify │ -> │ Render │
└────────────┘    └──────────┘    └───────┘    └───────┘    └────────┘    └────────┘
```

### 1. Retrieve
- **Input**: Job posting URL
- **Process**: Scrapes webpage using Playwright + Trafilatura
- **Output**: Cleaned text content
- **Location**: `services/extraction.py` (scraping logic)

### 2. Extract
- **Input**: Raw job description text
- **Process**: LLM-powered structured extraction
- **Output**: JSON metadata (company, title, requirements, language, seniority)
- **Location**: `services/extraction.py` (extraction agent)

### 3. Match
- **Input**: Job requirements + User profile
- **Process**: Maps job needs to verified facts from `data/personal_information/`
- **Output**: Relevant experience and skills
- **Status**: Planned (not fully implemented)

### 4. Draft
- **Input**: Matched facts + Template
- **Process**: Generates tailored cover letter content
- **Output**: Structured content blocks
- **Status**: Planned (not fully implemented)

### 5. Verify
- **Input**: Drafted content
- **Process**: Checks claims, tone, length, consistency
- **Output**: Validated content or revision requests
- **Status**: Planned (not fully implemented)

### 6. Render
- **Input**: Validated content + LaTeX templates
- **Process**: Populates templates and runs pdflatex
- **Output**: Professional PDF package
- **Location**: `services/document_service.py`

---

## Database Models

**LLMConfiguration**:
- Stores LLM provider settings (API keys, models)
- One active configuration at a time
- Supports multiple providers

**JobPosting**:
- Raw job description content
- Extracted metadata (JSON)
- Extraction status tracking
- Timestamps and notes

**GenerationHistory** (planned):
- Tracks generated documents
- Links to source postings
- Stores generation metadata

---

## Document Generation

**LaTeX Templates**:
- Stored in `data/cvs/` and `data/cover_letters/`
- Deterministic layout and formatting
- Use `\newcommand` for variable substitution with metadata

**PDF Generation Flow**:
1. Load template from database or filesystem
2. Replace `\newcommand` default values with extracted data
3. Write `.tex` file to temp directory
4. Run `pdflatex` to compile PDF
5. Move output to `output/` directory

---

## Key Design Principles

1. **Structured Data First**: All intermediate results are validated JSON/YAML, not free-form text
2. **Template-Based**: Layout and tone are deterministic; AI generates content only
3. **Human-in-the-Loop**: All drafts are reviewable and editable before rendering
4. **Provider Agnostic**: Supports multiple LLM providers via Pydantic-AI abstraction
5. **Async Everything**: All I/O operations use async/await for performance

---

## Data Flow Example

**From URL to PDF**:

1. User submits job URL via frontend
2. Frontend calls `POST /api/postings/` with URL
3. Backend creates `JobPosting` record (status: pending)
4. User triggers extraction via `POST /api/postings/{id}/extract`
5. Extraction agent scrapes URL and analyzes content
6. Structured metadata saved to `JobPosting.generated_metadata`
7. User reviews/edits metadata in frontend
8. User triggers generation via `POST /api/documents/generate`
9. Document service loads templates and populates with data
10. LaTeX compiler generates PDF
11. User downloads PDF from `output/` directory

---

## Observability

**OpenTelemetry Integration**:
- Traces for all API requests
- Spans for agent pipeline steps
- Metrics for generation success/failure rates
- Logs sent to Loki (when using observability stack)

**Stack** (optional):
- Grafana: Dashboards and visualization
- Loki: Log aggregation
- Tempo: Distributed tracing
- Mimir: Metrics storage
