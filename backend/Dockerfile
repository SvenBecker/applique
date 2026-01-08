FROM python:3.14-slim-bookworm

LABEL org.opencontainers.image.title="Appliqué Backend" \
	org.opencontainers.image.authors="Sven Becker <SvenBecker19@gmail.com>"

ARG UID=1000
ARG GID=1000
ARG DEBIAN_FRONTEND=noninteractive
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

ENV PYTHONUNBUFFERED=1 \
	PYTHONDONTWRITEBYTECODE=1 \
	RUNNING_IN_DOCKER=true \
	PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.9.21 /uv /uvx /bin/

# create group and user nonroot
RUN groupadd -g ${GID} -r nonroot && useradd -u ${UID} --no-log-init -r -g nonroot nonroot

# Install system dependencies for LaTeX
RUN apt-get update && apt-get install -y --no-install-recommends \
	texlive-latex-base \
	texlive-fonts-recommended \
	texlive-latex-extra \
	&& rm -rf /var/lib/apt/lists/*

COPY --chmod=755 entrypoint.sh ./
COPY pyproject.toml uv.lock alembic.ini ./

# Install Python dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
	uv sync --locked --no-install-project \
    && uv run playwright install --with-deps chromium

# Copy python source files
COPY applique_backend /app/applique_backend

# Sync the project
RUN --mount=type=cache,target=/root/.cache/uv \
	uv sync --locked

USER nonroot:nonroot
EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
