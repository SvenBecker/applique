# Appliqué

**Appliqué** is an agent-driven system for generating high-quality, role-specific job applications from a single input: a link to a job posting.

You provide a job URL. Appliqué retrieves and analyzes the posting, extracts structured metadata, matches it against your verified professional profile, and proposes tailored application documents using deterministic templates. The final application package is rendered with LaTeX to ensure consistent, professional PDFs.

---

## Why Appliqué?

Most "AI application tools" rely on one-shot prompts and opaque text generation. Appliqué takes a different approach:

- **Agentic, not generic**: A multi-step pipeline instead of a single prompt
- **Structured and reproducible**: All intermediate results are validated data (JSON/YAML), not free-form text
- **Template-first**: Layout, tone, and formatting are deterministic; agents fill content blocks
- **Human-in-the-loop**: Drafts are reviewable and editable before final rendering
- **Language-aware**: Supports DE/EN with role-, seniority-, and tone-specific adaptations

---

## How It Works

Appliqué follows a clear, auditable pipeline:

1. **Retrieve**: Fetches and cleans the job description from a provided URL
2. **Extract**: Converts the posting into structured metadata (role, requirements, keywords, language, seniority)
3. **Match**: Maps job requirements to verified facts from your profile *(planned)*
4. **Draft**: Proposes a tailored cover letter as structured content blocks *(planned)*
5. **Verify**: Checks claims, tone, length, and consistency to avoid hallucinations *(planned)*
6. **Render**: Renders LaTeX templates and builds a polished PDF application package

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/SvenBecker/applique.git
cd applique

# Install dependencies and setup environment
make setup

# Run development servers (backend + frontend)
make dev
```

Visit `http://localhost:8080` to access the application.

See the [Getting Started](getting-started.md) guide for detailed installation instructions.

---

## Features

- 🤖 **Multi-LLM Support**: OpenAI, Anthropic, Google, Groq, Cohere, Mistral, OpenRouter
- 📄 **Template Management**: Customizable LaTeX templates for CVs and cover letters
- 🔍 **Smart Extraction**: AI-powered metadata extraction from job postings
- ✏️ **Review & Edit**: Human-in-the-loop workflow for reviewing and editing generated content
- 💬 **Chat Interface**: Interactive AI assistant for job application questions
- 🎨 **Custom Prompts**: Tailor AI behavior with custom prompt templates
- 🐳 **Docker Support**: Easy deployment with Docker Compose
- 📊 **Observability**: Optional OpenTelemetry integration with Grafana LGTM stack

---

## Documentation

- **[Getting Started](getting-started.md)**: Installation and initial setup
- **[User Guide](user-guide.md)**: Using Appliqué to generate applications
- **[Configuration](configuration.md)**: Environment variables and settings
- **[Architecture](architecture.md)**: System design and technical overview
- **[Development](development.md)**: Contributing and extending Appliqué

---

## Project Status

Appliqué is under active development and designed primarily as a personal/power-user tool. The architecture is intentionally modular to support future extensions.

For planned features and upcoming enhancements, see the [Roadmap](https://github.com/SvenBecker/applique/blob/main/ROADMAP.md).

---

## License

This project is licensed under the terms specified in the [LICENSE](https://github.com/SvenBecker/applique/blob/main/LICENSE) file.
