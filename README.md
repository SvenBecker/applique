# Appliqué

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](http://github.com/SvenBecker/applique)
[![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://docs.astral.sh/ruff/)
[![Pre Commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit&logoColor=white)](https://github.com/pre-commit/pre-commit)

**Appliqué** is an agent-driven system for generating high-quality, role-specific job applications from a single input:
a link to a job posting.

You provide a job URL. Appliqué retrieves and analyzes the posting, extracts structured metadata, matches it against
your verified professional profile, and proposes a tailored cover letter using deterministic templates. The final
application package is rendered with LaTeX to ensure consistent, professional PDFs.

---

## Why appliqué?

Most “AI application tools” rely on one-shot prompts and opaque text generation. appliqué takes a different approach:

- **Agentic, not generic**
  A multi-step pipeline instead of a single prompt.

- **Structured and reproducible**
  All intermediate results are validated data (JSON/YAML), not free-form blobs.

- **Template-first**
  Layout, tone, and formatting are deterministic; agents fill content blocks.

- **Human-in-the-loop**
  Drafts are reviewable and editable before final rendering.

- **Language-aware**
  Supports DE/EN with role-, seniority-, and tone-specific adaptations.

---

## How It Works

Appliqué follows a clear, auditable pipeline:

1. **Retrieve**
   Fetches and cleans the job description from a provided URL.

2. **Extract**
   Converts the posting into structured metadata (role, requirements, keywords, language, seniority).

3. **Match**
   Maps job requirements to verified facts from your profile.

4. **Draft**
   Proposes a tailored cover letter as structured content blocks.

5. **Verify**
   Checks claims, tone, length, and consistency to avoid hallucinations.

6. **Render**
   Renders LaTeX templates and builds a polished PDF application package.

---

## Typical Use Case

1. Paste a job posting URL into the UI
2. Review extracted metadata and the proposed cover letter
3. Make optional edits
4. Build and download the final PDF application package

---

## Quick Start

### Prerequisites

- **Python**: 3.14+ (managed via [uv](https://docs.astral.sh/uv/))
- **Node.js**: Latest (managed via [bun](https://bun.sh/))
- **Docker**: For containerized deployment
- **LaTeX**: For PDF generation (pdflatex)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/SvenBecker/applique.git
cd applique

# Install dependencies
make setup

# Run development servers (backend + frontend)
make dev
```

The frontend will be available at `http://localhost:8080` and the backend at `http://localhost:8000`.

## Status & Roadmap

Appliqué is under active development and designed primarily as a personal / power-user tool. The architecture is
intentionally modular to support future extensions.

For planned features and upcoming enhancements, see [ROADMAP.md](ROADMAP.md).

---

## License

See [LICENSE](LICENSE) file for details.
