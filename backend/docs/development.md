# Development Guide

This guide covers development setup, code conventions, and contribution guidelines for Appliqué.

## Development Setup

### Prerequisites

- Python 3.11+ with [uv](https://docs.astral.sh/uv/)
- [Bun](https://bun.sh/) for frontend development
- [Make](https://www.gnu.org/software/make/)
- [pdflatex](https://www.tug.org/texlive/) for PDF generation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/SvenBecker/applique.git
cd applique

# Install dependencies
make setup

# Run development servers with hot reload
make dev
```

---

## Project Structure

```
applique/
├── backend/                      # Python backend
│   ├── applique_backend/
│   │   ├── api/                 # REST API layer
│   │   │   ├── routes/          # Endpoint handlers
│   │   │   ├── schemas.py       # Pydantic models
│   │   │   └── deps.py          # Dependencies
│   │   ├── services/            # Business logic
│   │   │   ├── llm.py           # LLM abstraction
│   │   │   ├── extraction.py    # Job extraction
│   │   │   └── document_service.py # PDF generation
│   │   ├── db/                  # Database layer
│   │   │   ├── models.py        # SQLAlchemy models
│   │   │   └── crud.py          # CRUD operations
│   │   └── core/                # Core functionality
│   ├── tests/                   # Backend tests
│   ├── docs/                    # Documentation
│   ├── pyproject.toml           # Python dependencies
│   └── alembic/                 # Database migrations
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── routes/              # Pages (file-based routing)
│   │   ├── components/          # React components
│   │   └── lib/                 # Utilities
│   ├── package.json             # npm dependencies
│   └── tsconfig.json            # TypeScript config
├── data/                         # User data (gitignored)
├── output/                       # Generated PDFs
├── Makefile                      # Development commands
└── compose.yml                   # Docker configuration
```

---

## Development Commands

### Core Commands

```bash
# Setup environment
make setup                # Install all dependencies

# Development servers
make dev                  # Run both backend + frontend
make backend              # Run backend only (port 8000)
make frontend             # Run frontend only (port 8080)

# Code quality
make check                # Run all checks
make lint                 # Lint code
make format               # Format code
make typing               # Type checking

# Testing
make test                 # Run all tests
make coverage             # Generate coverage report
```

### Backend Commands

```bash
# Install dependencies
cd backend && uv sync --all-groups

# Run server with hot reload
cd backend && uv run python -m applique_backend.app --reload

# Type checking
cd backend && uv run ty check applique_backend/

# Linting
cd backend && uv run ruff check applique_backend/

# Formatting
cd backend && uv run ruff format applique_backend/

# Run specific test
cd backend && uv run pytest tests/test_file.py::test_function -v

# Run with debug output
cd backend && uv run pytest tests/test_file.py -v -s
```

### Frontend Commands

```bash
# Install dependencies
cd frontend && bun install

# Dev server with hot reload
cd frontend && bun run dev

# Build for production
cd frontend && bun run build

# Type checking
cd frontend && bun run typecheck

# Linting
cd frontend && bun run lint

# Formatting
cd frontend && bun run format
```

### Database Commands

```bash
# Apply migrations
make migrate

# Create new migration
make migration-gen MSG="add user table"

# Rollback migration (destructive)
make migration-downgrade

# Check migration status
make migration-check
```

### Docker Commands

```bash
# Build images
make docker-build

# Start containers
make docker-up

# Start with observability
make docker-obs-up

# View logs
make docker-logs

# Stop containers
make docker-down

# Clean Docker resources
make clean-docker
```

---

## Code Style Guidelines

### Backend (Python)

**Required:**

- Type hints for ALL function signatures and class attributes
- Pydantic v2 syntax: `model_validate`, `ConfigDict`, `model_dump`, `Field`
- SQLAlchemy 2.x: Use `mapped_column` syntax, NOT `Column()`
- Async/await for all database and I/O operations
- Dependency injection: `Annotated[AsyncSession, Depends(get_db)]`

**Example**:

```python
from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from applique_backend.api.deps import get_db
from applique_backend.api.schemas import PostingResponse
from applique_backend.db import crud


async def get_posting(
	posting_id: int,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> PostingResponse:
	posting = await crud.get_posting(db, posting_id)
	return PostingResponse.model_validate(posting)
```

**Code Organization:**

- API schemas: `applique_backend/api/schemas.py`
- Database models: `applique_backend/db/models.py`
- CRUD operations: `applique_backend/db/crud.py`
- Route handlers: `applique_backend/api/routes/`
- Business logic: `applique_backend/services/`

### Frontend (TypeScript)

**Required:**

- Strict TypeScript (avoid `any` unless necessary)
- Import types with `import type { Type } from ...`
- TanStack Query for all API calls
- TanStack Router for file-based routing
- Biome for linting and formatting

**Example**:

```typescript
import type {Posting} from '@/lib/types'
import {useQuery} from '@tanstack/react-query'
import {postingsApi} from '@/lib/api'

export function PostingDetail({id}: { id: number }) {
	const {data: posting} = useQuery({
		queryKey: ['posting', id],
		queryFn: () => postingsApi.getPosting(id),
	})

	if (!posting) return <div>Loading
...
	</div>

	return <div>{posting.title} < /div>
}
```

**Code Organization:**

- API client: `src/lib/api.ts` (grouped by domain)
- Types: `src/lib/types.ts` (mirror backend schemas)
- Routes: `src/routes/*.tsx` (file-based routing)
- UI components: `src/components/ui/`
- Custom components: `src/components/`

---

## Testing

### Backend Tests

Located in `backend/tests/`. Uses pytest with async support.

**Run tests:**

```bash
cd backend
uv run pytest
```

**Test structure:**

```python
import pytest
from httpx import AsyncClient
from applique_backend.app import create_app


@pytest.mark.asyncio
async def test_create_posting():
	app = create_app()
	async with AsyncClient(app=app, base_url="http://test") as client:
		response = await client.post(
			"/api/postings/",
			json={"url": "https://example.com/job"}
		)
		assert response.status_code == 201
```

**Coverage:**

```bash
make coverage
# View report at backend/htmlcov/index.html
```

### Frontend Tests

Testing setup is planned. Will use:

- Vitest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests

---

## Adding New Features

### Adding a New API Endpoint

1. **Define Pydantic schemas** in `backend/applique_backend/api/schemas.py`:
   ```python
   class PostingCreate(BaseModel):
       url: str
       notes: str | None = None
   ```

2. **Add route handler** in `backend/applique_backend/api/routes/`:
   ```python
   @router.post("/", response_model=PostingResponse, status_code=201)
   async def create_posting(
       posting: PostingCreate,
       db: Annotated[AsyncSession, Depends(get_db)],
   ) -> PostingResponse:
       db_posting = await crud.create_posting(db, posting)
       return PostingResponse.model_validate(db_posting)
   ```

3. **Add CRUD operation** in `backend/applique_backend/db/crud.py`:
   ```python
   async def create_posting(
       db: AsyncSession,
       posting: PostingCreate,
   ) -> JobPosting:
       db_posting = JobPosting(**posting.model_dump())
       db.add(db_posting)
       await db.commit()
       await db.refresh(db_posting)
       return db_posting
   ```

4. **Add frontend API call** in `frontend/src/lib/api.ts`:
   ```typescript
   export const postingsApi = {
     createPosting: async (data: PostingCreate) => {
       const response = await fetch('/api/postings/', {
         method: 'POST',
         body: JSON.stringify(data),
       })
       return response.json()
     },
   }
   ```

### Adding a New Frontend Page

1. **Create route file** in `frontend/src/routes/`:
   ```typescript
   // frontend/src/routes/my-page.tsx
   import { createFileRoute } from '@tanstack/react-router'

   export const Route = createFileRoute('/my-page')({
     component: MyPage,
   })

   function MyPage() {
     return <div>My Page</div>
   }
   ```

2. **Add navigation link** in `frontend/src/components/Header.tsx`

### Adding a New Agent Step

1. **Create agent logic** in `backend/applique_backend/services/`:
   ```python
   from pydantic_ai import Agent
   from applique_backend.services.llm import get_model

   async def verify_content(content: str) -> dict:
       agent = Agent(
           model=get_model(),
           system_prompt="You are a fact-checker..."
       )
       result = await agent.run(content)
       return result.data
   ```

2. **Integrate into pipeline** in existing service layer

3. **Add API endpoint** to trigger the agent

4. **Update frontend** to call the new endpoint

---

## Database Migrations

When you modify database models:

1. **Update model** in `backend/applique_backend/db/models.py`:
   ```python
   class JobPosting(Base):
       __tablename__ = "job_postings"
       
       id: Mapped[int] = mapped_column(primary_key=True)
       new_field: Mapped[str] = mapped_column(String)  # Added
   ```

2. **Generate migration**:
   ```bash
   make migration-gen MSG="add new_field to job_postings"
   ```

3. **Review migration** in `backend/alembic/versions/`

4. **Apply migration**:
   ```bash
   make migrate
   ```

---

## Debugging

### Backend Debugging

**Use pdb:**

```python
import pdb;

pdb.set_trace()
```

**VS Code launch.json:**

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"name": "Python: FastAPI",
			"type": "python",
			"request": "launch",
			"module": "applique_backend.app",
			"console": "integratedTerminal"
		}
	]
}
```

### Frontend Debugging

**Browser DevTools**: Use Chrome/Firefox DevTools

**React DevTools**: Install browser extension

**TanStack Query DevTools**: Already integrated (dev mode only)

---

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes** following the code style guidelines
4. **Run tests and linting**: `make check && make test`
5. **Commit your changes**: `git commit -m "Add my feature"`
6. **Push to your fork**: `git push origin feature/my-feature`
7. **Open a Pull Request**

### Pull Request Guidelines

- Clear description of changes
- Reference related issues
- Include tests for new features
- Update documentation as needed
- Ensure CI passes

---

## Resources

- **FastAPI**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com/)
- **Pydantic**: [docs.pydantic.dev](https://docs.pydantic.dev/)
- **Pydantic-AI**: [pydantic-ai.com](https://pydantic-ai.com/)
- **SQLAlchemy 2.x**: [docs.sqlalchemy.org](https://docs.sqlalchemy.org/)
- **TanStack Router**: [tanstack.com/router](https://tanstack.com/router)
- **TanStack Query**: [tanstack.com/query](https://tanstack.com/query)
- **shadcn/ui**: [ui.shadcn.com](https://ui.shadcn.com/)

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/SvenBecker/applique/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SvenBecker/applique/discussions)
