# Customization

This guide covers how to customize Appliqué to match your professional profile and preferences.

---

## Identity Management

The `data/` directory is where you define your professional **identity**. It contains all the personal information,
templates, and assets that Appliqué uses to tailor job applications specifically to you.

!!! warning "Privacy"
The `data/` directory is gitignored by default to ensure your private data remains local to your machine.

### Directory Structure

```
data/
├── personal_information/  # Professional profile and background
├── cvs/                    # CV LaTeX templates
├── cover_letters/          # Cover letter LaTeX templates
├── attachments/            # Supporting documents (certificates, references)
├── images/                 # Profile pictures and logos
└── prompts/                # Custom AI prompt templates
```

---

## Personal Information

### The Core Identity

The most critical part of your identity is maintained in `data/personal_information/`. Create a comprehensive text file
that outlines your career path, key achievements, and technical expertise. This file can be used by the AI to match your
skills to job requirements and create personalized resumes.

**Location**: `data/personal_information/personal_information.txt`

**What to Include**:

```txt
# Professional Summary
Senior Software Engineer with 10+ years of experience in full-stack 
development, specializing in Python, TypeScript, and cloud architecture.
Led teams of 5-10 engineers, delivered 20+ production systems.

# Technical Skills
- Languages: Python, TypeScript, Go, Java
- Frameworks: FastAPI, React, Django, Spring Boot
- Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
- Cloud: AWS (EC2, S3, Lambda), Google Cloud Platform
- DevOps: Docker, Kubernetes, GitHub Actions, Terraform

# Professional Experience

## Senior Software Engineer | Tech Corp | 2020 - Present
- Led architecture redesign of microservices platform, improving 
  performance by 40%
- Mentored 5 junior engineers, established code review practices
- Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes
- Technologies: Python, FastAPI, PostgreSQL, Docker, Kubernetes

## Software Engineer | StartupCo | 2018 - 2020
- Built real-time analytics dashboard processing 100k events/second
- Designed REST API serving 10M requests/day
- Reduced database query time by 60% through optimization
- Technologies: Node.js, React, MongoDB, Redis

# Education
- M.Sc. Computer Science, University of Technology (2018)
- B.Sc. Software Engineering, University of Engineering (2015)

# Certifications
- AWS Certified Solutions Architect (2022)
- Certified Kubernetes Administrator (2021)

# Languages
- English: Native
- German: Fluent (C1)
- Spanish: Intermediate (B1)
```

!!! tip "Detail Matters"
The more detailed and structured this file is, the better the AI can match your experience to job requirements and
generate compelling applications.

---

## Document Templates

LaTeX templates are stored in `data/cover_letters/` and `data/cvs/`.

**Example**: `data/cover_letters/my_cover_letter.tex`

```latex
\documentclass[11pt,a4paper,sans]{moderncv}
\usepackage[utf8]{inputenc}
\usepackage[german]{babel}

% Define template variables with defaults
\newcommand{\companyname}{Company Name Here}
\newcommand{\recipientname}{Hiring Manager}
\newcommand{\streetaddress}{Company Street}
\newcommand{\city}{City}
\newcommand{\zipcode}{00000}
\newcommand{\jobtitle}{Position Title}

\name{First}{Last}

\begin{document}

\recipient{\recipientname}{\companyname\\\streetaddress\\\zipcode{} \city}
\date{\today}
\opening{Sehr geehrte Damen und Herren,}

I am writing to express my interest in the \jobtitle{} position at \companyname.

\closing{Mit freundlichen Grüßen,}

\end{document}
```

**Template Variables** (mapped from job posting metadata):

- `\companyname`: Extracted from job posting
- `\recipientname`: Extracted from job posting
- `\jobtitle`: Extracted from job posting
- `\streetaddress`: Company street address
- `\city`: Company city
- `\zipcode`: Company postal code

---

## Supporting Documents

### Attachments

Store supporting documents in `data/attachments/`:

- Degree certificates
- Reference letters
- Professional certifications
- Transcripts
- Work samples

**Supported Formats**: PDF (recommended)

**Usage**: Select attachments to include when generating application packages.

### Images

Store profile pictures and logos in `data/images/`:

- Professional headshot
- Company logos (for custom templates)
- Signature images

**Supported Formats**: JPG, PNG

---

## Custom Prompts

Appliqué uses a **two-tier prompt management system** that allows you to customize AI behavior without modifying code.

### How It Works

The system uses a fallback mechanism:

1. **User Templates** (Priority): `data/prompts/` - your custom prompts
2. **Default Templates** (Fallback): `backend/applique_backend/services/prompts/templates/` - shipped with the
   application

When rendering a prompt, Appliqué checks for user templates first. If found, your custom version is used; otherwise, it
falls back to the default.

### Available Prompts

| Prompt Template                        | Purpose                                        | Customization Use Case                              |
|----------------------------------------|------------------------------------------------|-----------------------------------------------------|
| `job_information_extraction.txt.jinja` | Extracts structured metadata from job postings | Improve extraction accuracy for specific industries |
| `chat_instructions.txt.jinja`          | Defines chat assistant behavior                | Adjust tone, focus areas, expertise level           |

### Customization Examples

#### Job Information Extraction

**Location**: `data/prompts/job_information_extraction.txt.jinja`

Customize to improve extraction for your target industry:

```jinja
You are an expert at analyzing job postings in the {{ industry }} industry.

Extract the following information:
- Company name
- Job title
- Required skills (focus on {{ priority_skills }})
- Language (DE/EN)
- Seniority level

Pay special attention to:
- Industry-specific terminology
- Certifications and qualifications
- Remote work options
```

#### Chat Instructions

**Location**: `data/prompts/chat_instructions.txt.jinja`

Customize the AI assistant's personality and expertise:

```jinja
You are an expert career advisor specializing in {{ field }}.

Your role is to:
- Analyze job postings and identify key requirements
- Suggest how to tailor applications for maximum impact
- Review extracted metadata for accuracy
- Provide industry-specific advice

Focus areas:
- Emphasize {{ key_strengths }}
- Highlight experience with {{ core_technologies }}
- Match communication style to {{ target_seniority }} level positions

Tone: {{ preferred_tone }} (professional, friendly, formal, etc.)
```

### Creating Custom Prompts

1. **Copy the example**:
   ```bash
   cp data/prompts/chat_instructions.txt.jinja.example \
      data/prompts/chat_instructions.txt.jinja
   ```

2. **Edit the template**:
   ```bash
   nano data/prompts/chat_instructions.txt.jinja
   ```

3. **Use Jinja2 syntax** for variables and logic:
   ```jinja
   {% if target_industry == "finance" %}
   Focus on compliance and regulatory experience.
   {% elif target_industry == "tech" %}
   Emphasize technical depth and innovation.
   {% endif %}
   ```

4. **Restart the application** to load changes

---

## Template Management via UI

You can also manage templates through the Documents page in the web interface:

1. Navigate to **Documents** page
2. Click **Upload Template**
3. Choose template type (CV or Cover Letter)
4. Paste or upload your LaTeX content
5. Set as default (optional)
6. Click **Save**

**Benefits**:

- No need to access the filesystem
- Version history (future feature)
- Preview templates before using

---

## Best Practices

### Personal Information

1. **Keep it Updated**: Review and update regularly with new skills and experiences
2. **Be Specific**: Include concrete achievements with metrics (e.g., "improved performance by 40%")
3. **Structure Clearly**: Use headings and sections for easy parsing
4. **Include Context**: Explain the impact of your work, not just responsibilities

### Templates

1. **Test Thoroughly**: Generate test PDFs to ensure templates compile correctly
2. **Multiple Versions**: Maintain different templates for different roles or industries
3. **Consistent Formatting**: Use the same LaTeX packages and styling across templates
4. **Comments**: Add LaTeX comments to document template structure

### Prompts

1. **Start Simple**: Begin with minor tweaks to default prompts
2. **Test Changes**: Verify custom prompts produce desired results
3. **Iterate**: Refine based on output quality
4. **Document Variables**: Note which variables are available in comments

### Security

1. **Backup Regularly**: Keep copies of your `data/` directory
2. **Never Commit**: Ensure `data/` remains gitignored
3. **Secure Storage**: Store sensitive documents (certificates) securely
4. **API Keys**: Use environment variables, not hardcoded values

---

## Troubleshooting

### Template Compilation Errors

**Issue**: LaTeX template fails to compile

**Solution**:

1. Verify LaTeX syntax with a standalone compiler
2. Check for missing packages
3. Review template variables are correctly populated
4. Check logs in `output/` directory

### Prompt Not Loading

**Issue**: Custom prompt not being used

**Solution**:

1. Verify file is in `data/prompts/`
2. Check filename matches expected name exactly
3. Restart the application
4. Check logs for loading errors

### Extraction Quality

**Issue**: Metadata extraction is inaccurate

**Solution**:

1. Customize `job_information_extraction.txt.jinja` prompt
2. Provide more industry-specific context
3. Review and edit extracted metadata manually
4. Try different LLM models (e.g., GPT-5.2 vs GPT-5)
