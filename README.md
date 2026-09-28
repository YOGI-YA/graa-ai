# Graa AI

Graa AI is an open-source, full-stack autonomous learning platform built with Next.js, TypeScript, PostgreSQL, and a multi-tier AI inference engine. It converts learning goals, syllabi, or academic textbooks into structured, day-by-day mastery roadmaps featuring gated milestone progression, active-recall quizzes, an interactive code sandbox, and a retrieval-augmented generation (RAG) AI mentor.

---

## Repository

```bash
git clone https://github.com/YOGI-YA/graa-ai.git
cd graa-ai
```

---

## System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                  USER / CLIENT                                    |
|   Browser (Next.js App Router UI)                                                 |
|   - Goal Creation & Document Ingestion (Client-side PDF.js extraction)            |
|   - Day-by-Day Learning Interface (Lessons, Gated MCQs, Interactive Playground)   |
|   - Real-time AI Mentor Chat (Streaming Server-Sent Events)                       |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                             NEXT.JS API BACKEND                                   |
|                                                                                   |
|  [Auth Layer]          [Curriculum Engine]        [Analytics & Progress]          |
|  NextAuth (JWT/OAuth)  Docx/PDF text extraction   Streak & Accuracy Tracking      |
+-------------------+--------------------+--------------------+---------------------+
                    |                    |                    |
                    v                    v                    v
+-----------------------------------------------------------------------------------+
|                        MULTI-TIER AI INFERENCE FALLBACK                           |
|                                                                                   |
|   TIER 1: GROQ (Ultra-low latency primary)                                        |
|   - Models: openai/gpt-oss-120b -> qwen/qwen3.8-27b -> openai/gpt-oss-20b         |
|   - Key Pool: GROQ_API_KEY_1, _2, _3 (Round-robin + 429 Cooldown)                |
|           | (on rate limit, quota exhaustion, or service outage)                  |
|           v                                                                       |
|   TIER 2: NVIDIA NIM (High-intelligence failover & Vision OCR)                    |
|   - Models: meta/llama-3.2-11b-vision-instruct -> nemotron-70b -> llama-3.2-90b    |
|   - Key Pool: NVIDIA_API_KEY (Automatic failover)                                 |
|           | (if configured)                                                       |
|           v                                                                       |
|   TIER 3: EXTENDED PROVIDERS (OpenRouter, Cerebras, SambaNova, Together AI)       |
+-----------------------------------------+-----------------------------------------+
                                          |
                    +---------------------+---------------------+
                    |                                           |
                    v                                           v
+---------------------------------------+   +---------------------------------------+
|        VECTOR RAG & EMBEDDINGS        |   |         DATABASE & STORAGE            |
|                                       |   |                                       |
|  Jina AI Embeddings Engine            |   |  Neon PostgreSQL                      |
|  - Model: jina-embeddings-v3 (384-dim)|   |  - Core data: Users, Goals, Lessons,  |
|  - Key Pool: EMBEDDINGS_API_KEY_1,2,3 |   |    Milestones, Quizzes, Progress      |
|  - Automatic failover & key rotation  |   |  - pgvector: content_chunks table for |
|                                       |   |    grounded semantic search in chat   |
+---------------------------------------+   +---------------------------------------+
                    |
                    v
+-----------------------------------------------------------------------------------+
|                            CODE EXECUTION SANDBOX                                 |
|  - Paiza.io API (Default zero-config runner for 11+ languages)                    |
|  - Optional self-hosted Piston Engine (Isolated container runtime)                |
+-----------------------------------------------------------------------------------+
```

---

## Key Features

- **Document & Syllabus Ingestion**: Extracts text from PDFs (client-side PDF.js and server-side stream decoding), Word documents (`.docx`), Markdown, and scanned documents via Vision OCR.
- **Atomic Roadmap Generation**: Deconstructs high-level goals or course syllabi into focused, sequential daily modules with explicit milestones.
- **Gated Progression Loop**: Unlocks each subsequent day only after passing the active-recall multiple-choice quiz (70% threshold).
- **Interactive Code Playground**: Embedded Monaco editor with support for 11 languages, automated AI feedback, and code execution.
- **RAG-Grounded AI Mentor**: Streaming chat assistant grounded directly in the user's uploaded syllabus via pgvector cosine similarity search.
- **Resilient AI Fallback Engine**: Multi-key rotation, automatic rate-limit cooldown handling, and seamless multi-provider failover (Groq to NVIDIA NIM).

---

## Quick Start

### 1. Prerequisites

- Node.js 18.18 or higher (Node 20+ recommended)
- PostgreSQL database instance with the `pgvector` extension enabled (e.g., Neon.tech)

### 2. Installation

```bash
git clone https://github.com/YOGI-YA/graa-ai.git
cd graa-ai
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Populate the variables in `.env` (refer to the [Environment Variables](#environment-variables) section below).

### 4. Database Setup & Run

Push the Prisma schema to your PostgreSQL database:

```bash
npx prisma db push
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

All supported environment variables are detailed below:

| Variable | Description | Required / Optional | Default / Example Value |
|:---|:---|:---|:---|
| `DATABASE_URL` | PostgreSQL connection string (supports `pgvector`). | **Required** | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `NEXTAUTH_SECRET` | 32-byte secret string used to sign session cookies and JWTs. Generate using `openssl rand -hex 32`. | **Required** | `7f3c1d9a2b8e...` |
| `NEXTAUTH_URL` | Canonical base URL of the application. | **Required** | `http://localhost:3000` (development) or `https://your-domain.com` (production) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL used for metadata, OpenGraph tags, and canonical links. | **Required** | `https://graaai.vercel.app` |
| `GROQ_API_KEY_1` | Primary Groq API key for high-speed LLM inference. | **Required** | `gsk_...` |
| `GROQ_API_KEY_2` | Secondary Groq key for automatic round-robin rotation and 429 failover. | Optional | `gsk_...` |
| `GROQ_API_KEY_3` | Tertiary Groq key for rotation and rate-limit mitigation. | Optional | `gsk_...` |
| `GROQ_MODEL` | Primary LLM model identifier on Groq. | Optional | `openai/gpt-oss-120b` (falls back to `qwen/qwen3.8-27b`) |
| `NVIDIA_API_KEY` | NVIDIA NIM API key for secondary LLM failover and Vision OCR document parsing. | Optional | `nvapi-...` |
| `NVIDIA_MODEL` | Model identifier used for NVIDIA NIM inference and fallback. | Optional | `meta/llama-3.2-11b-vision-instruct` |
| `EMBEDDINGS_API_URL` | Endpoint URL for the vector embeddings service. | Optional | `https://api.jina.ai/v1/embeddings` |
| `EMBEDDINGS_API_KEY` | Primary API key for vector embeddings (Jina AI). | Optional | `jina_...` |
| `EMBEDDINGS_API_KEY_1` | First key in the embedding key rotation pool. | Optional | `jina_...` |
| `EMBEDDINGS_API_KEY_2` | Second key in the embedding rotation pool for rate-limit failover. | Optional | `jina_...` |
| `EMBEDDINGS_API_KEY_3` | Third key in the embedding rotation pool. | Optional | `jina_...` |
| `EMBEDDINGS_MODEL` | Model used for document and query vector generation. | Optional | `jina-embeddings-v3` |
| `EMBEDDING_DIM` | Dimensionality of the generated vector embeddings (matches pgvector schema). | Optional | `384` |
| `PISTON_URL` | Base URL for a self-hosted Piston code execution sandbox. Leave blank to use Paiza.io. | Optional | `http://localhost:2000` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for social sign-in. | Optional | `your-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret for social sign-in. | Optional | `GOCSPX-...` |
| `PDF_EXTRACTOR_SERVICE_URL` | URL to a standalone microservice for heavy PDF extraction. Not required; native parser is active. | Optional | `http://localhost:8000` |

---

## Complete Ready-to-Run `.env` Configuration

To get running immediately, create a file named `.env` in the project root and paste this configuration directly:

```bash
# ==============================================================================
# Database (PostgreSQL with pgvector)
# ==============================================================================
DATABASE_URL=""

# ==============================================================================
# Authentication (NextAuth)
# ==============================================================================
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="https://graaai.vercel.app"

# ==============================================================================
# AI Inference - Tier 1 Primary (Groq with 3-key rotation)
# ==============================================================================
GROQ_API_KEY_1=""
GROQ_API_KEY_2=""
GROQ_API_KEY_3=""
GROQ_MODEL="openai/gpt-oss-120b"

# ==============================================================================
# AI Inference - Tier 2 Fallback & Vision OCR (NVIDIA NIM)
# ==============================================================================
NVIDIA_API_KEY=""
NVIDIA_MODEL="meta/llama-3.2-11b-vision-instruct"

# ==============================================================================
# Vector Embeddings for RAG (Jina AI with 3-key rotation)
# ==============================================================================
EMBEDDINGS_API_URL="https://api.jina.ai/v1/embeddings"
EMBEDDINGS_API_KEY=""
EMBEDDINGS_API_KEY_1=""
EMBEDDINGS_API_KEY_2=""
EMBEDDINGS_API_KEY_3=""
EMBEDDINGS_MODEL="jina-embeddings-v3"
EMBEDDING_DIM="384"

# ==============================================================================
# Optional Services
# ==============================================================================
PISTON_URL=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
PDF_EXTRACTOR_SERVICE_URL=""
```

---

## How the Fallback Chain Operates

1. **Round-Robin Key Balancing**: Requests are distributed across configured keys (`GROQ_API_KEY_1`, `_2`, `_3`) to maintain balance within RPM and TPM quotas.
2. **Cooldown Management**:
   - `429 Too Many Requests`: Puts the affected key on a 35-second cooldown and routes subsequent requests to the next healthy key immediately.
   - `401 / 403 Authentication Error`: Puts the invalid key on a 5-minute cooldown.
   - `5xx Provider Error`: Puts the key on a 15-second cooldown.
3. **Immediate Model Skipping**: If an endpoint returns `400 Bad Request` or `404 Not Found` (e.g., deprecated model parameter or decommissioned model), the engine skips all remaining keys for that model and switches to the next fallback model in the list.
4. **Provider Cascade**: If all Groq keys are exhausted or rate-limited, requests fail over to NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct` and `nvidia/llama-3.1-nemotron-70b-instruct`).
5. **Reasoning Model Handling**: When using models with internal reasoning tokens (e.g., `openai/gpt-oss-120b`), token allocations are dynamically expanded (2048 in streaming, up to 4096 in standard calls) to prevent token cutoff.

---

## Deployment

### Docker

A production-ready `Dockerfile` and `docker-compose.yml` are included in the repository.

```bash
# 1. Build and start the container in detached mode
docker-compose up -d --build

# 2. Apply database migrations
docker-compose exec app npx prisma db push
```

The application will be accessible at `http://localhost:3000`.

### Vercel

1. Import the repository `https://github.com/YOGI-YA/graa-ai` in the Vercel dashboard.
2. Under **Project Settings > Environment Variables**, add the variables from your `.env` file.
3. Set `NEXTAUTH_URL` to your production domain (e.g., `https://your-domain.vercel.app`).
4. Deploy the project.

### AWS App Runner

1. Connect the GitHub repository `https://github.com/YOGI-YA/graa-ai` to AWS App Runner.
2. Select runtime: `Nodejs 20`.
3. Build command:
   ```bash
   npx prisma generate && npm run build
   ```
4. Start command:
   ```bash
   npm start
   ```
5. Set port to `3000` and supply the environment variables in the App Runner console.

---

## Project Structure

```text
graa-ai/
├── app/
│   ├── api/                         # Backend API route handlers
│   │   ├── auth/[...nextauth]/      # NextAuth authentication endpoints
│   │   ├── chat/                    # RAG mentor streaming SSE endpoint
│   │   ├── curriculum/parse/        # Document parser and roadmap generator
│   │   ├── goals/                   # Goal and milestone CRUD routes
│   │   ├── performance/             # Analytics and mastery aggregation
│   │   └── run/                     # Multi-language code runner endpoint
│   ├── dashboard/                   # Main user dashboard and metrics
│   ├── goals/[id]/                  # Roadmap viewer and daily task flow
│   │   └── day/[day]/               # Day lesson, quiz, and sandbox
│   ├── login/ & register/           # Authentication pages
│   └── page.tsx                     # Landing page
├── components/                      # Reusable React components
├── lib/
│   ├── auth.ts                      # NextAuth configuration and providers
│   ├── curriculumParser.ts          # PDF, DOCX, and image OCR processing
│   ├── embeddings.ts                # Jina embeddings multi-key fallback engine
│   ├── groq.ts                      # Multi-tier LLM inference fallback chain
│   ├── prisma.ts                    # Prisma client singleton
│   └── rag.ts                       # pgvector chunking, indexing, and retrieval
├── prisma/
│   └── schema.prisma                # PostgreSQL data schema
└── types/                           # Shared TypeScript type definitions
```

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
