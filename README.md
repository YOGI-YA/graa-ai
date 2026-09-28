# 🎓 Graa AI — Autonomous Day-by-Day Learning Platform

[![GitHub Repository](https://img.shields.io/badge/GitHub-YogenderVermaa%2Fgraa--ai-orange?style=flat&logo=github)](https://github.com/YogenderVermaa/graa-ai)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-336791?style=flat&logo=postgresql)](https://neon.tech/)
[![Groq](https://img.shields.io/badge/AI%20Inference-Groq%20(Sub--4s)-f55036?style=flat)](https://groq.com/)
[![AWS Ready](https://img.shields.io/badge/Deployment-AWS%20App%20Runner%20%2F%20Docker-FF9900?style=flat&logo=amazon-aws)](https://aws.amazon.com/)

**Graa AI** transforms any academic syllabus, university textbook, or learning goal into an actionable, **day-by-day mastery roadmap**. It pairs structured daily progression with curated video tutorials, progressive lessons, active-recall quiz gates, a live multi-language code playground, an AI mentor grounded in your curriculum via RAG, and an overall cross-goal performance analytics dashboard.

**Zero External Microservices Needed:** Runs as a **100% self-contained application** that can be hosted for **$0** on free tiers or deployed to enterprise cloud providers like **AWS (App Runner, ECS, EC2)**, **Vercel**, or any Docker host.

---

## ⚡ Key Highlights & Core Features

### 1. 📤 Smart Syllabus & Large Textbook Processing (Up to 50MB+)
- Upload PDFs, Word documents (`.docx`), Markdown, or plain text.
- **Client-Side PDF.js Engine**: Decodes massive 500+ page university textbooks directly inside the user's browser, extracting Table of Contents and bookmark outlines in **~1.5 seconds**.
- Bypasses cloud serverless upload limits by sending a clean ~20KB text outline rather than multi-megabyte binary files.
- **"Behind The Scenes" Visualizer**: Live terminal telemetry, multi-stage synthesis pipeline, elapsed timer, and science-backed study tips keep users visually engaged while the AI generates the roadmap in **~3.5 seconds**.

### 2. 🗺️ Strict Day-by-Day Learning Gating Loop
```
Syllabus Upload or Goal Prompt
              │
              ▼
Day-by-Day Progressive Roadmap (7 to 90 Days)
              │
              ▼
Day Learning Page  ── Curated YouTube video + documentation + AI lesson
              │
              ▼
MCQ Quiz (≥70% pass requirement)  ── Pass to unlock the day's practical challenge
              │
              ▼
In-Browser Code Playground  ── Monaco editor (11 languages), live Run, progressive Hints & AI grading
              │
              ▼
Day Auto-Completes ➔ Next Day Unlocks!
              ▲
              │
🤖 AI Mentor (Graa)  ── Contextual chat grounded in your curriculum via RAG (pgvector)
```

### 3. 📊 Overall Cross-Goal Performance Dashboard (`/dashboard/performance`)
- **Mastery Radar Chart**: Multi-dimensional scoring across Consistency, Velocity, Accuracy, Depth, Problem Solving, and Retention.
- **GitHub-Style Activity Heatmap**: Daily learning streak tracking across weeks and months.
- **Subject-Wise Mastery Breakdown**: Track accuracy and completion across Programming, Mathematics, Data Science, and more.
- **Goal Portfolio Table**: Comprehensive view of all roadmaps, tasks completed, quiz accuracy, and target dates.

### 4. 💻 In-Browser Code Sandbox & Evaluation
- **Monaco Editor**: Syntax highlighting and code editing for 11 languages (Python, JavaScript, TypeScript, C++, C, Java, Go, Rust, Ruby, PHP, C#).
- **Execution & Grading**: Test code with live compiler outputs, unlock progressive hints, and submit for automated AI feedback and grading.

---

## 🏗️ Technology Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) + React 19 | Server & Client web application |
| **Language** | TypeScript 5 | End-to-end type safety |
| **Styling** | Tailwind CSS v4 | Responsive glassmorphic "ember" dark theme |
| **Database** | PostgreSQL + `pgvector` | User state, roadmaps, task completion, RAG vectors |
| **ORM** | Prisma 5 | Schema migrations and type-safe DB queries |
| **Primary LLM** | Groq (`qwen/qwen3.8-27b`) | Sub-4s roadmap generation, quizzes, and code grading |
| **Fallback LLM** | NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct`) | Vision AI OCR and secondary text inference |
| **Embeddings** | Jina AI (`jina-embeddings-v3`, 384-dim) | Semantic RAG embeddings for AI mentor chat |
| **Authentication** | NextAuth.js v4 | Credentials (JWT) and optional Google OAuth |
| **Containerization** | Docker (Alpine Multi-Stage) | Standalone ~120MB image ready for AWS / Docker |

---

## 🔑 Required API Keys & Services (100% Free Tiers)

To host this platform, you only need free API keys from these services (setup takes ~5 minutes):

1. **PostgreSQL Database** *(Free)*:
   - Create a free database at [Neon.tech](https://neon.tech) (comes with built-in `pgvector`).
   - Copy the connection string: `postgresql://user:password@host/db?sslmode=require`.
2. **Groq AI Key** *(Free)*:
   - Sign up at [console.groq.com](https://console.groq.com) and create an API key (`gsk_...`).
   - Groq provides ultra-fast inference with generous free rate limits.
3. **Jina AI Embeddings Key** *(Free)*:
   - Get a free key at [jina.ai/embeddings](https://jina.ai/embeddings) (includes 10 million free tokens for RAG).
4. **NextAuth Secret**:
   - Generate any random 32-character string (e.g. run `openssl rand -hex 32` in your terminal).
5. **NVIDIA API Key** *(Optional Fallback)*:
   - Free 1,000 credits at [build.nvidia.com](https://build.nvidia.com) for vision OCR fallback.

---

## 🚀 How to Host & Deploy

### Option 1: Deploy on AWS (Recommended: AWS App Runner)

AWS App Runner provides fully managed container execution, automated zero-downtime deployments from GitHub, automatic HTTPS/SSL certificates, and auto-scaling.

1. **Fork or Clone the Repository**:
   ```bash
   git clone https://github.com/YogenderVermaa/graa-ai.git
   ```
2. **Open AWS App Runner**:
   - Navigate to [AWS App Runner Console](https://console.aws.amazon.com/apprunner).
   - Click **Create an App Runner service**.
3. **Connect GitHub**:
   - Choose **Source code repository** ➔ Link your GitHub account.
   - Select repository: `YogenderVermaa/graa-ai`, Branch: `main`.
   - Select **Automatic deployment**.
4. **Configure Build Settings**:
   - **Runtime**: `Nodejs 20` *(or select Container image if using ECR)*.
   - **Build command**: `npx prisma generate && npm run build`
   - **Start command**: `npm start`
   - **Port**: `3000`
5. **Add Environment Variables** (see table below).
6. **Click Deploy**:
   - In 3–5 minutes, AWS will provide you with a live HTTPS URL (e.g. `https://xyz.awsapprunner.com`).

*(See [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) for detailed ECS, Fargate, and EC2 instructions).*

---

### Option 2: Deploy with Docker / Docker Compose (Any VPS / EC2 / Lightsail)

The repository includes a production-ready, multi-stage [`Dockerfile`](Dockerfile) and [`docker-compose.yml`](docker-compose.yml):

```bash
# 1. Clone repository
git clone https://github.com/YogenderVermaa/graa-ai.git
cd graa-ai/graa-ai

# 2. Configure environment
cp .env.example .env
nano .env # Paste your database and API keys

# 3. Apply Prisma database schema
npx prisma db push

# 4. Build and start container in detached mode
docker-compose up -d --build
```
Your application will be live at `http://localhost:3000` (or your server's public IP).

---

### Option 3: Deploy on Vercel

1. Import the repository `YogenderVermaa/graa-ai` in [Vercel](https://vercel.com).
2. Framework Preset: **Next.js**.
3. Under **Settings → Environment Variables**, add the environment variables listed below.
4. Set `NEXTAUTH_URL` to your production Vercel URL (e.g. `https://your-app.vercel.app`).
5. Click **Deploy**.

---

## ⚙️ Complete Environment Variables (`.env`)

Create a `.env` file in the root directory and copy-paste the entire block below:

```bash
# ==============================================================================
# 1. DATABASE (PostgreSQL with pgvector)
# ==============================================================================
# Create a free database at https://neon.tech and paste your connection string:
DATABASE_URL="postgresql://username:password@ep-your-instance.region.aws.neon.tech/neondb?sslmode=require"

# ==============================================================================
# 2. NEXTAUTH AUTHENTICATION
# ==============================================================================
# Generate a random 32-character string using: openssl rand -hex 32
NEXTAUTH_SECRET="7f3c1d9a2b8e4f5061728394a5b6c7d8e9f0123456789abcdef0123456789abc"

# The canonical URL of your site (use http://localhost:3000 for local development)
NEXTAUTH_URL="http://localhost:3000"

# Public URL used for metadata and SEO
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# ==============================================================================
# 3. AI INFERENCE ENGINE (Groq - Free at https://console.groq.com)
# ==============================================================================
# Primary Groq API Key (You can add multiple keys for automatic round-robin rotation)
GROQ_API_KEY_1="gsk_your_groq_api_key_here"
# GROQ_API_KEY_2="gsk_optional_second_key_here"
# GROQ_API_KEY_3="gsk_optional_third_key_here"

# Default ultra-fast model (produces roadmaps in ~3.2 seconds without reasoning token overhead)
GROQ_MODEL="qwen/qwen3.8-27b"

# ==============================================================================
# 4. VISION AI / OCR FALLBACK (NVIDIA NIM - Free 1,000 credits at https://build.nvidia.com)
# ==============================================================================
NVIDIA_API_KEY="nvapi-your_nvidia_api_key_here"
NVIDIA_MODEL="meta/llama-3.2-11b-vision-instruct"

# ==============================================================================
# 5. VECTOR EMBEDDINGS (Jina AI - Free 10M tokens at https://jina.ai/embeddings)
# ==============================================================================
# Powers the streaming AI Mentor (Graa) grounded in your curriculum via RAG
EMBEDDINGS_API_URL="https://api.jina.ai/v1/embeddings"
EMBEDDINGS_API_KEY_1="jina_your_jina_key_here"
# EMBEDDINGS_API_KEY_2="jina_optional_second_key_here"
# EMBEDDINGS_API_KEY_3="jina_optional_third_key_here"
EMBEDDINGS_MODEL="jina-embeddings-v3"
EMBEDDING_DIM="384"

# ==============================================================================
# 6. CODE PLAYGROUND & EXECUTION (Optional)
# ==============================================================================
# Leave empty to use free Paiza.io execution (no key needed).
# Or provide your self-hosted Piston endpoint (e.g., https://piston.example.com/api/v2/piston)
PISTON_URL=""

# ==============================================================================
# 7. GOOGLE OAUTH LOGIN (Optional)
# ==============================================================================
# Leave empty to use email/password authentication only.
# To enable "Sign in with Google", create credentials in Google Cloud Console:
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### Detailed Environment Variables Breakdown

| Variable | Required | Description | Where to Get |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string | [Neon.tech](https://neon.tech) (Free tier) or AWS RDS |
| `NEXTAUTH_SECRET` | **Yes** | 32+ character JWT secret | Run `openssl rand -hex 32` |
| `NEXTAUTH_URL` | **Yes** | Canonical URL of the platform | `http://localhost:3000` (local) or `https://your-domain.com` (prod) |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Public site URL for SEO & metadata | `http://localhost:3000` (local) or `https://your-domain.com` (prod) |
| `GROQ_API_KEY_1` | **Yes** | Groq API key for roadmaps & quizzes | [console.groq.com](https://console.groq.com) (Free) |
| `GROQ_MODEL` | **Yes** | Fast AI model identifier | `qwen/qwen3.8-27b` |
| `EMBEDDINGS_API_URL` | **Yes** | Vector embeddings API endpoint | `https://api.jina.ai/v1/embeddings` |
| `EMBEDDINGS_API_KEY_1`| **Yes** | Jina API key for RAG chat | [jina.ai/embeddings](https://jina.ai/embeddings) (Free) |
| `EMBEDDINGS_MODEL` | **Yes** | Embedding model name | `jina-embeddings-v3` |
| `EMBEDDING_DIM` | **Yes** | Dimension size for `pgvector` | `384` |
| `NVIDIA_API_KEY` | *Optional*| Vision AI key for scanned document OCR | [build.nvidia.com](https://build.nvidia.com) (Free) |
| `NVIDIA_MODEL` | *Optional*| Vision model name | `meta/llama-3.2-11b-vision-instruct` |
| `PISTON_URL` | *Optional*| Custom Piston compiler endpoint | Leave empty for free Paiza.io |
| `GOOGLE_CLIENT_ID` | *Optional*| Google Cloud OAuth Client ID | [console.cloud.google.com](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET`| *Optional*| Google Cloud OAuth Client Secret | [console.cloud.google.com](https://console.cloud.google.com) |

---

## 💻 Local Development Setup

To run Graa AI locally on your development machine:

```bash
# 1. Clone repository
git clone https://github.com/YogenderVermaa/graa-ai.git
cd graa-ai/graa-ai

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env with your PostgreSQL and Groq credentials

# 4. Push database schema & generate Prisma Client
npx prisma db push

# 5. Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Repository Structure

```
graa-ai/
├── app/
│   ├── page.tsx                     # Landing page with interactive hero & animations
│   ├── login/ & register/           # NextAuth credentials & Google login
│   ├── dashboard/                   # Main dashboard (Goal cards, stats, curriculum upload)
│   │   └── performance/             # Cross-goal performance & mastery analytics dashboard
│   ├── goals/[id]/                  # Interactive roadmap view (phases, milestones, days)
│   │   └── day/[day]/               # Day learning interface (Video, AI lesson, Quiz, Code Sandbox)
│   ├── profile/                     # User preferences & learning style settings
│   └── api/
│       ├── auth/[...nextauth]/      # Authentication API
│       ├── curriculum/parse/        # Curriculum processing & atomic roadmap generation
│       ├── performance/             # Cross-goal analytics aggregation API
│       ├── goals/ & goals/[id]/     # Goal CRUD & day content endpoints
│       ├── chat/                    # RAG AI mentor streaming endpoint
│       └── run/                     # Multi-language code execution runner
├── components/
│   ├── CurriculumUploadModal.tsx    # Upload modal with live "Behind the Scenes" visualizer
│   ├── OverallPerformanceDashboard.tsx # Radar charts, velocity, and activity heatmaps
│   ├── DayLearning.tsx              # Day lesson, video player, language switcher
│   ├── CodePlayground.tsx           # Monaco editor with multi-language execution
│   ├── QuizPanel.tsx                # Gated MCQ assessment component
│   └── RoadmapGraph.tsx             # Interactive milestone & task progression tree
├── lib/
│   ├── clientCurriculumParser.ts    # In-browser PDF.js & Table of Contents extraction
│   ├── curriculumParser.ts          # Server-side native PDF & Word document parsing
│   ├── groq.ts                      # Multi-provider LLM inference engine (Groq, NVIDIA)
│   ├── rag.ts                       # pgvector vector store & context retrieval
│   └── prisma.ts                    # PostgreSQL Prisma client & connection pooling
├── prisma/
│   └── schema.prisma                # PostgreSQL database schema with composite indexes
├── public/
│   └── pdf.worker.min.mjs           # Local offline WebAssembly PDF worker
├── Dockerfile                       # Production multi-stage Alpine Dockerfile
├── docker-compose.yml               # Local & VPS container configuration
├── AWS_DEPLOYMENT.md                # Dedicated step-by-step AWS deployment guide
└── next.config.ts                   # Next.js config with standalone output enabled
```

---

## 📜 License & Acknowledgments

This project is licensed under the **MIT License** — you are free to use, modify, and distribute it for personal or commercial projects.

- **Author**: [Yogender Verma](https://github.com/YogenderVermaa)
- **Repository**: [https://github.com/YogenderVermaa/graa-ai](https://github.com/YogenderVermaa/graa-ai)
