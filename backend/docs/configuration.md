# Configuration

This page documents the configuration options available in Appliqué.

## Environment Variables

Appliqué uses environment variables for configuration. While most settings can be configured through the UI, some
require environment variables.

### Database Configuration

| Variable       | Default                               | Description                |
|----------------|---------------------------------------|----------------------------|
| `DATABASE_DSN` | `sqlite+aiosqlite:///data/db.sqlite3` | Database connection string |

**Example (PostgreSQL)**:

```bash
export DATABASE_DSN="postgresql+asyncpg://user:password@localhost/applique"
```

### Server Configuration

| Variable     | Default       | Description                        |
|--------------|---------------|------------------------------------|
| `HOST`       | `0.0.0.0`     | Server host address                |
| `PORT`       | `8000`        | Server port                        |
| `RELOAD`     | `false`       | Enable auto-reload on code changes |
| `LOG_CONFIG` | `logging.yml` | Path to logging configuration file |

**Example**:

```bash
export HOST="127.0.0.1"
export PORT="8080"
export RELOAD="true"
```

### Observability Configuration

Appliqué supports OpenTelemetry for traces, metrics, and logs.

| Variable            | Default                 | Description                              |
|---------------------|-------------------------|------------------------------------------|
| `OTEL_EXPORTER`     | `none`                  | Exporter type: `none`, `console`, `otlp` |
| `OTEL_ENDPOINT`     | `http://localhost:4317` | OTLP endpoint for traces/metrics/logs    |
| `OTEL_SERVICE_NAME` | `applique-backend`      | Service name for telemetry               |

**Example (with Grafana LGTM stack)**:

```bash
export OTEL_EXPORTER="otlp"
export OTEL_ENDPOINT="http://localhost:4317"
export OTEL_SERVICE_NAME="applique-backend"
```

---

## Configuration Files

### Logging Configuration

Logging is configured via `backend/logging.yml`. You can customize log levels, formats, and handlers.

**Example**:

```yaml
version: 1
disable_existing_loggers: false

formatters:
	default:
		format: '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

handlers:
	console:
		class: logging.StreamHandler
		formatter: default
		stream: ext://sys.stdout

root:
	level: INFO
	handlers: [ console ]

loggers:
	applique_backend:
		level: DEBUG
		handlers: [ console ]
		propagate: false
```

### Database Migrations

Database schema is managed with Alembic. Configuration is in `backend/alembic.ini`.

**Common Commands**:

```bash
# Apply migrations
make migrate

# Create a new migration
make migration-gen MSG="description"

# Rollback last migration
make migration-downgrade

# Check current migration status
make migration-check
```

---

## Identity Configuration

The `data/` directory contains your personal data and is gitignored by default for privacy.

### Directory Structure

```
data/
├── personal_information/
│   └── personal_information.txt     # Your professional profile
├── cvs/
│   └── cv_de.tex                    # CV templates (LaTeX)
├── cover_letters/
│   └── cover_letter_de.tex          # Cover letter templates (LaTeX)
├── attachments/
│   └── certificates.pdf             # Supporting documents
├── images/
│   └── profile.jpg                  # Profile pictures
└── prompts/
    └── chat_instructions.txt.jinja  # Custom AI prompts
```

### Personal Information

Create a comprehensive text file describing your professional background:

```txt
# Professional Summary
Senior Software Engineer with 10+ years of experience in full-stack development...

# Technical Skills
- Languages: Python, TypeScript, Go
- Frameworks: FastAPI, React, Django
- Databases: PostgreSQL, MongoDB, Redis

# Experience
## Senior Software Engineer at Company X (2020-Present)
- Led development of microservices architecture
- Improved API performance by 40%
...
```

**Tip**: The more detailed this file, the better the AI can tailor your applications.

### Custom Prompts

Override default AI behavior by creating custom prompt templates in `data/prompts/`:

- `job_information_extraction.txt.jinja`: Customize metadata extraction
- `chat_instructions.txt.jinja`: Customize chat assistant behavior

**Example**:

```jinja
You are an expert career advisor specializing in {{ industry }}.
Your role is to help craft compelling job applications...
```

---

## LLM Provider Setup

### OpenAI

1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Generate an API key
3. Configure in UI or set `OPENAI_API_KEY` environment variable

**Recommended Models**:

- `gpt-4o`: Best quality
- `gpt-4o-mini`: Faster, cost-effective
- `gpt-3.5-turbo`: Economical option

### Anthropic

1. Sign up at [console.anthropic.com](https://console.anthropic.com/)
2. Generate an API key
3. Configure in UI or set `ANTHROPIC_API_KEY`

**Recommended Models**:

- `claude-3-opus`: Highest capability
- `claude-3-sonnet`: Balanced performance
- `claude-3-haiku`: Fast and economical

### Google (Gemini)

1. Get API key from [ai.google.dev](https://ai.google.dev/)
2. Configure in UI or set `GOOGLE_API_KEY`

**Recommended Models**:

- `gemini-pro`: General purpose
- `gemini-pro-vision`: For image analysis (future)

### Other Providers

- **Groq**: Fast inference - [console.groq.com](https://console.groq.com/)
- **Cohere**: Enterprise focus - [cohere.com](https://cohere.com/)
- **Mistral**: Open models - [mistral.ai](https://mistral.ai/)
- **OpenRouter**: Multi-provider access - [openrouter.ai](https://openrouter.ai/)

---

## Docker Configuration

### Standard Deployment

Use `compose.yml` for standard deployment:

```yaml
services:
	backend:
		build: ./backend
		ports:
			- "8000:8000"
		volumes:
			- ./data:/app/data
			- ./output:/app/output
		environment:
			- DATABASE_DSN=sqlite+aiosqlite:///data/db.sqlite3
```

### With Observability

Use `compose.observability.yml` to add the LGTM stack:

```bash
docker compose -f compose.yml -f compose.observability.yml up
```

Includes:

- **Grafana** (port 3000): Visualization and dashboards
- **Loki**: Log aggregation
- **Tempo**: Distributed tracing
- **Mimir**: Metrics storage

---

## Production Considerations

### Security

1. **Never commit secrets**: Use environment variables or secret management
2. **Restrict database access**: Use proper user permissions
3. **Enable HTTPS**: Use a reverse proxy (nginx, Traefik)
4. **Secure API keys**: Rotate keys regularly

### Performance

1. **Use PostgreSQL**: For production, switch from SQLite
2. **Enable caching**: Configure Redis for session/query caching (future)
3. **Rate limiting**: Implement API rate limits (future)
4. **Resource limits**: Set appropriate Docker resource constraints

### Backup

1. **Database**: Regular backups of your database
2. **Identity data**: Backup `data/` directory regularly
3. **Generated documents**: Archive `output/` directory

### Monitoring

1. **Enable observability**: Use the LGTM stack
2. **Set up alerts**: Configure Grafana alerts for errors
3. **Track costs**: Monitor LLM API usage and costs
