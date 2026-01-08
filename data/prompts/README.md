# Prompt Management System

This directory contains user-customizable Jinja2 templates for all AI prompts used in Appliqué.

## Overview

Appliqué uses a **two-tier prompt system** with **template inheritance support**:
1. **Default Templates**: Shipped with the application in `backend/applique_backend/services/prompts/templates/`
2. **User Templates**: Customizable templates in `data/prompts/` (this directory)

When rendering a prompt, the system checks `data/prompts/` first. If a custom template exists, it's used. Otherwise, the default template is used as a fallback.

**New in this version:** Templates support Jinja2's `{% extends %}` feature, allowing you to inherit from defaults and only override specific sections!

## Available Templates

### Job Information Extraction
**File**: `job_information_extraction.txt.jinja`  
**Purpose**: System prompt for extracting structured metadata from job postings  
**Variables**: None (used as system prompt)

### Chat Instructions
**File**: `chat_instructions.txt.jinja`  
**Purpose**: Complete chat assistant instructions with dynamic context (consolidates all chat-related prompts)  
**Variables**:
- `job_posting` (JobPostingContext | None)
  - `job_posting.job_title` (str | None)
  - `job_posting.company_name` (str | None)
  - `job_posting.url` (str)
  - `job_posting.description` (str | None)
  - `job_posting.full_content` (str | None)
- `personal_info` (str | None): User's personal information text
- `cv_content` (str | None): LaTeX CV content
- `cover_letter_content` (str | None): LaTeX cover letter content

**Template Blocks** (for inheritance):
- `{% block base_instructions %}` - Base chat assistant role and capabilities
- `{% block job_context %}` - Job posting information display
- `{% block personal_info_context %}` - Personal information display
- `{% block cv_context %}` - CV content display
- `{% block cover_letter_context %}` - Cover letter content display
- `{% block capabilities %}` - What the assistant can help with

## Customizing Templates

### Method 1: Direct Editing

Edit `chat_instructions.txt.jinja` directly to customize all aspects:

```jinja
You are a professional job application assistant.

{% if job_posting %}
## Current Job Posting
**Job Title:** {{ job_posting.job_title or 'N/A' }}
**Company:** {{ job_posting.company_name or 'N/A' }}
{% endif %}

{# Add your custom logic here #}
```

### Method 2: Template Inheritance (Recommended!)

Use Jinja's `{% extends %}` to inherit from the default and only override specific sections:

```jinja
{# Inherit from the default template #}
{% extends "chat_instructions.txt.jinja" %}

{# Override only the base instructions #}
{% block base_instructions %}
You are an expert career coach specializing in tech industry positions.

I focus on:
- Software engineering roles
- Senior-level applications
- Highlighting unique value propositions

Let's optimize your application materials!
{% endblock %}

{# Keep all other blocks (job_context, cv_context, etc.) from the default #}
```

**See `chat_instructions.txt.jinja.example` for more inheritance examples!**

### Method 3: Use the API

The application provides REST API endpoints for managing prompts:

#### List all prompts
```bash
GET /api/prompts
```

#### Get a specific prompt
```bash
GET /api/prompts/chat_instructions.txt.jinja
```

#### Preview a prompt with context
```bash
POST /api/prompts/chat_instructions.txt.jinja/preview
{
  "context": {
    "job_posting": {
      "job_title": "Senior Engineer",
      "company_name": "Acme Corp",
      "url": "https://example.com/job"
    },
    "cv_content": "\\documentclass{article}..."
  }
}
```

#### Update a prompt
```bash
PUT /api/prompts/chat_instructions.txt.jinja
{
  "content": "Your custom prompt here"
}
```

#### Reset to default
```bash
DELETE /api/prompts/chat_instructions.txt.jinja
```

## Jinja2 Syntax Reference

### Variables
```jinja
{{ variable_name }}
```

### Conditionals
```jinja
{% if condition %}
  content when true
{% else %}
  content when false
{% endif %}
```

### Loops
```jinja
{% for item in items %}
  {{ item }}
{% endfor %}
```

### Default Values
```jinja
{{ variable_name or 'default value' }}
```

### Comments
```jinja
{# This is a comment and won't appear in output #}
```

## Best Practices

1. **Always test changes**: Use the preview API endpoint before saving
2. **Keep backups**: Copy templates before making major changes
3. **Document your variables**: Use Jinja comments to explain what variables are available
4. **Be specific**: Clear, specific prompts typically work better than vague ones
5. **Version control**: Track changes to your custom prompts in git

## Troubleshooting

### Template syntax errors
If you see rendering errors, check:
- Jinja2 syntax is correct (matching `{% %}` tags)
- Variable names match available context
- No unclosed tags

### Template not being used
- Ensure the filename exactly matches the default template name
- Check file permissions (must be readable)
- Restart the application if hot reload is disabled
