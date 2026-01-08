# User Guide

This guide walks you through using Appliqué to generate personalized job application documents.

## Overview

Appliqué transforms job posting URLs into tailored CVs and cover letters through a simple workflow:

1. Configure your LLM provider
2. Add a job posting URL
3. Extract and review metadata
4. Generate application documents
5. Download your PDF package

---

## Getting Started

### 1. Configure LLM Provider

Before generating applications, you need to configure an LLM provider.

**Navigate to**: LLM Configuration page

**Supported Providers**:
- OpenAI (gpt-4, gpt-3.5-turbo)
- Anthropic (claude-3-opus, claude-3-sonnet)
- Google (gemini-pro)
- Groq, Cohere, Mistral, OpenRouter

**Steps**:
1. Select your provider from the dropdown
2. Enter your API key
3. Choose a model
4. Click "Save Configuration"

!!! tip "API Keys"
    Store your API keys in the `.env` file or set them as environment variables for security.

---

## Main Workflow

### 2. Add Job Postings

**Navigate to**: Postings page

**Add a New Posting**:
1. Click "Add Posting"
2. Paste the job posting URL
3. Optionally add notes
4. Click "Create"

The application will:
- Scrape the job description
- Store the raw content
- Prepare it for metadata extraction

### 3. Extract Metadata

Once a posting is added, you can extract structured information from it.

**Extraction Process**:
1. Click "Extract Metadata" on a posting
2. The AI agent analyzes the job description
3. Extracts key information:
   - Company name
   - Job title
   - Recipient name and address
   - Required skills
   - Language (DE/EN)
   - Seniority level

**Review and Edit**:
- View extracted metadata in the posting detail view
- Edit any incorrect information directly
- Save your changes

**Status Indicators**:
- 🟡 **Pending**: Not yet processed
- 🔵 **Processing**: Extraction in progress
- 🟢 **Completed**: Successfully extracted
- 🔴 **Failed**: Extraction error (check logs)

---

## Document Generation

### 4. Manage Templates

**Navigate to**: Documents page

**LaTeX Templates**:
- **CVs**: Your curriculum vitae templates
- **Cover Letters**: Cover letter templates

**Template Management**:
1. View existing templates
2. Edit template content (LaTeX syntax)
3. Upload new templates
4. Set default templates for generation

!!! note "Template Customization"
    Templates use LaTeX formatting with `\newcommand` for variables. Define variables with default values, and the system will replace them with actual job posting data.

### 5. Generate PDFs

**From Postings Page**:
1. Select a posting with completed metadata
2. Click "Generate Documents"
3. Choose your templates:
   - CV template
   - Cover letter template
4. Click "Generate"

The system will:
1. Match job requirements to your profile
2. Draft tailored content
3. Verify claims and consistency
4. Render LaTeX templates
5. Generate PDF package

**Download**:
- PDFs are stored in the `output/` directory
- Download directly from the generation history

---

## Chat Interface

**Navigate to**: Chat page

The chat interface provides an AI assistant for:
- Answering questions about job postings
- Reviewing extracted metadata
- Getting suggestions for application content
- Troubleshooting issues

**Usage**:
1. Type your question
2. Reference specific postings or documents
3. Get AI-powered assistance

---

## Customization

### Personal Information

Your professional identity is stored in `data/personal_information/`.

**What to Include**:
- Career history
- Technical skills
- Notable achievements
- Education background
- Certifications

!!! tip "Detail Matters"
    The more comprehensive your profile, the better the AI can match your experience to job requirements.

### Custom Prompts

Customize AI behavior by editing prompt templates in `data/prompts/`.

**Available Prompts**:
- `job_information_extraction.txt.jinja`: Metadata extraction logic
- `chat_instructions.txt.jinja`: Chat assistant behavior

**Customization Use Cases**:
- Industry-specific terminology
- Seniority-level emphasis
- Regional application styles
- Personal communication tone
