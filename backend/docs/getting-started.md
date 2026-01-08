# Getting Started

This guide will help you get Appliqué up and running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.14+**: Managed via [uv](https://docs.astral.sh/uv/)
- **Bun**: JavaScript runtime - [Installation Guide](https://bun.sh/)
- **Make**: Build automation tool (usually pre-installed on macOS/Linux)
- **pdflatex**: LaTeX distribution for PDF generation - [TeX Live](https://www.tug.org/texlive/)
- **Docker** (optional): For containerized deployment

### Installing uv

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Installing pdflatex

**macOS**:

```bash
brew install --cask mactex-no-gui
```

**Ubuntu/Debian**:

```bash
sudo apt-get install texlive-latex-base texlive-latex-extra
```

**Windows**:
Download and install [MiKTeX](https://miktex.org/download) or [TeX Live](https://www.tug.org/texlive/).

---

## Installation

### Option 1: Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/SvenBecker/applique.git
   cd applique
   ```

2. **Run the setup command**

   This will install all dependencies for both backend and frontend:
   ```bash
   make setup
   ```

3. **Prepare your identity data**

   The `data/` directory stores your personal information, templates, and documents. Create your profile:
   ```bash
   # Copy example personal information
   cp data/personal_information/personal_information.example.txt \
      data/personal_information/personal_information.txt
   
   # Edit with your information
   nano data/personal_information/personal_information.txt
   ```

4. **Configure LLM provider**

   You'll need an API key from one of the supported LLM providers. The application supports:
	- OpenAI
	- Anthropic
	- Google (Gemini)
	- Groq
	- Cohere
	- Mistral
	- OpenRouter

   You can configure this through the UI after starting the application, or set environment variables (
   see [Configuration](configuration.md)).

5. **Run the application**
   ```bash
   make dev
   ```

   This starts both the backend (port 8000) and frontend (port 8080) in development mode with hot reload.

6. **Access the application**

   Open your browser and navigate to:
	- **Frontend**: [http://localhost:8080](http://localhost:8080)
	- **Backend API**: [http://localhost:8000](http://localhost:8000)
	- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option 2: Docker Deployment

For a containerized setup, use Docker Compose:

1. **Clone the repository**
   ```bash
   git clone https://github.com/SvenBecker/applique.git
   cd applique
   ```

2. **Build and start containers**
   ```bash
   make docker-up
   ```

   Or manually:
   ```bash
   docker compose up --build
   ```

3. **Access the application**
	- **Frontend**: [http://localhost:8080](http://localhost:8080)
	- **Backend**: [http://localhost:8000](http://localhost:8000)

4. **Stop the containers**
   ```bash
   make docker-down
   ```

#### Docker with Observability Stack

To run with the full LGTM (Loki, Grafana, Tempo, Mimir) observability stack:

```bash
make docker-obs-up
```

Additional services available:

- **Grafana**: [http://localhost:3000](http://localhost:3000)

---

### Option 3: Dev Container (VS Code)

If you use VS Code, you can use the provided Dev Container which comes pre-configured:

1. Open the project in VS Code
2. Install the "Dev Containers" extension
3. Run **Dev Containers: Reopen in Container** from the Command Palette
4. The environment will be automatically set up with Python 3.14, `uv`, `bun`, and `pdflatex`

---

## Initial Configuration

### 1. Set Up Your Identity

Your professional identity is stored in the `data/` directory:

```
data/
├── personal_information/  # Your professional background
├── cvs/                    # CV LaTeX templates
├── cover_letters/          # Cover letter LaTeX templates
├── attachments/            # Supporting documents (certificates, etc.)
├── images/                 # Profile pictures, logos
└── prompts/                # Custom AI prompt templates
```

See [Customization](user-guide.md#customization) for detailed instructions.

### 2. Configure LLM Provider

After starting the application:

1. Navigate to the **LLM Configuration** page
2. Select your provider
3. Enter your API key
4. Choose a model
5. Click **Save Configuration**

See [Configuration](configuration.md) for environment variable options.

### 3. Apply Database Migrations

If you're running locally, ensure the database is up to date:

```bash
make migrate
```

---

## Verify Installation

Test your setup by:

1. **Check backend health**:
   ```bash
   curl http://localhost:8000/readyz
   ```

2. **Access the frontend**: Open [http://localhost:8080](http://localhost:8080)

3. **Generate a test document**:
	- Add a sample job posting URL
	- Extract metadata
	- Generate a PDF
