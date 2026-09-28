# 🎓 Graa AI — Autonomous Day-by-Day Learning Platform

[![GitHub Repository](https://img.shields.io/badge/GitHub-YogenderVermaa%2Fgraa--ai-orange?style=flat&logo=github)](https://github.com/YogenderVermaa/graa-ai)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-336791?style=flat&logo=postgresql)](https://neon.tech/)
[![Groq](https://img.shields.io/badge/AI%20Inference-Groq%20(Sub--4s)-f55036?style=flat)](https://groq.com/)
[![AWS Ready](https://img.shields.io/badge/Deployment-AWS%20App%20Runner%20%2F%20Docker-FF9900?style=flat&logo=amazon-aws)](https://aws.amazon.com/)

**Graa AI** transforms any academic syllabus, university textbook, or learning goal into an actionable, **day-by-day mastery roadmap**. It pairs structured daily progression with curated video tutorials, progressive lessons, active-recall quiz gates, a live multi-language code playground, an AI mentor grounded in your curriculum via RAG, and an overall cross-goal performance analytics dashboard.

> 💡 **Self-Contained Architecture:** Graa AI runs as a single, unified Next.js application. **You do NOT need any external microservice or Python worker** to host this platform. It handles large 50MB+ textbooks directly via client-side PDF.js and native Node.js.

---

## ⚡ Quick Start in 4 Steps (Run Locally in 5 Minutes)

### Step 1: Clone the Repository
```bash
git clone https://github.com/YogenderVermaa/graa-ai.git
cd graa-ai/graa-ai
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create a file named `.env` in the root folder (`graa-ai/graa-ai/.env`) and paste the configuration below (see [Environment Variables Section](#-complete-copy-paste-env-file) for exact details).

### Step 4: Initialize Database & Start
```bash
npx prisma db push
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🔑 The 4 Required Services (All 100% Free)

You only need **3 free API keys + 1 free database connection** to run the entire platform:

| # | Service | Purpose | Free Tier Limit | Where to Get (2 Mins) |
|---|:---|:---|:---|:---|
| **1** | **Neon PostgreSQL** | Primary Database + Vector Storage (`pgvector`) | 0.5 GB Free Forever | [neon.tech](https://neon.tech) ➔ Create Project ➔ Copy `DATABASE_URL` |
| **2** | **Groq Cloud** | Fast Roadmap & Quiz Generation | Generous Free Rate Limits | [console.groq.com](https://console.groq.com) ➔ API Keys ➔ Create Key (`gsk_...`) |
| **3** | **Jina AI** | AI Mentor RAG Embeddings | 10,000,000 Free Tokens | [jina.ai/embeddings](https://jina.ai/embeddings) ➔ Generate API Key (`jina_...`) |
| **4** | **NextAuth Secret** | Secures User Login & JWTs | Free | Run terminal command: `openssl rand -hex 32` |

*(NVIDIA Vision AI, Google OAuth, and Piston Sandbox are 100% **optional** — the application runs completely without them).*

---

## ⚙️ Complete Copy-Paste `.env` File

Create a file named **`.env`** in `graa-ai/graa-ai/.env` and paste this block directly:

```bash
# ==============================================================================
# 1. DATABASE (PostgreSQL with pgvector) - REQUIRED
# ==============================================================================
# Create a free project at https://neon.tech and paste your connection string:
DATABASE_URL="postgresql://username:password@ep-your-instance.region.aws.neon.tech/neondb?sslmode=require"

# ==============================================================================
# 2. NEXTAUTH AUTHENTICATION - REQUIRED
# ==============================================================================
# Generate with: openssl rand -hex 32
NEXTAUTH_SECRET="7f3c1d9a2b8e4f5061728394a5b6c7d8e9f0123456789abcdef0123456789abc"

# Local URL for development (change to https://your-domain.com in production)
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# ==============================================================================
# 3. AI INFERENCE (Groq) - REQUIRED
# ==============================================================================
# Get your free key at https://console.groq.com
GROQ_API_KEY_1="gsk_your_groq_api_key_here"

# Model setting: qwen/qwen3.8-27b generates roadmaps in ~3.2s with zero reasoning overhead
GROQ_MODEL="qwen/qwen3.8-27b"

# ==============================================================================
# 4. VECTOR EMBEDDINGS (Jina AI) - REQUIRED FOR AI MENTOR
# ==============================================================================
# Get your free key at https://jina.ai/embeddings
EMBEDDINGS_API_URL="https://api.jina.ai/v1/embeddings"
EMBEDDINGS_API_KEY_1="jina_your_jina_key_here"
EMBEDDINGS_MODEL="jina-embeddings-v3"
EMBEDDING_DIM="384"

# ==============================================================================
# 5. VISION AI / OCR FALLBACK - OPTIONAL
# ==============================================================================
# Optional: Used only if a user uploads a pure scanned image PDF without selectable text
NVIDIA_API_KEY="nvapi-optional_nvidia_key_here"
NVIDIA_MODEL="meta/llama-3.2-11b-vision-instruct"

# ==============================================================================
# 6. CODE PLAYGROUND COMPILER - OPTIONAL
# ==============================================================================
# Leave empty to use free Paiza.io compiler (no setup needed).
PISTON_URL=""

# ==============================================================================
# 7. GOOGLE OAUTH LOGIN - OPTIONAL
# ==============================================================================
# Leave empty to use standard Email/Password authentication.
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

---

## ☁️ How to Host This Platform

You have three clean options to deploy Graa AI. **AWS App Runner** is recommended for production.

```
                          ┌─────────────────────────┐
                          │   GitHub Repository     │
                          │ YogenderVermaa/graa-ai  │
                          └────────────┬────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                ▼                      ▼                      ▼
      ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
      │  AWS App Runner  │   │  Docker / VPS    │   │      Vercel      │
      │   (Recommended)  │   │ (EC2/Lightsail)  │   │  (Serverless)    │
      │ • Auto HTTPS/SSL │   │ • docker-compose │   │ • 1-click import │
      │ • Zero server ops│   │ • Full control   │   │ • Edge gateway   │
      └──────────────────┘   └──────────────────┘   └──────────────────┘
```

---

### Method 1: Deploy to AWS (Recommended: AWS App Runner)

AWS App Runner runs containerized Next.js apps directly from GitHub with automatic SSL, zero server management, and auto-scaling.

1. **Log in to AWS Console**: Open [AWS App Runner](https://console.aws.amazon.com/apprunner).
2. **Create Service**: Click **Create service**.
3. **Connect GitHub**:
   - Choose **Source code repository** ➔ Connect your GitHub account.
   - Select repository: `YogenderVermaa/graa-ai`, Branch: `main`.
   - Deployment trigger: **Automatic**.
4. **Configure Build Settings**:
   - **Runtime**: `Nodejs 20` *(or select Container image if deploying via Docker)*.
   - **Build command**:
     ```bash
     npx prisma generate && npm run build
     ```
   - **Start command**:
     ```bash
     npm start
     ```
   - **Port**: `3000`
5. **Add Environment Variables**:
   - Under **Environment variables**, copy-paste the variables from your `.env` file (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GROQ_API_KEY_1`, `GROQ_MODEL`, etc.).
   - Make sure `NEXTAUTH_URL` is set to your production domain or App Runner URL.
6. **Click Deploy**:
   - AWS will build the project and assign a secure `https://...awsapprunner.com` live URL in ~3–5 minutes.

*(For AWS ECS, Fargate, and EC2 walkthroughs, see [`AWS_DEPLOYMENT.md`](AWS_DEPLOYMENT.md)).*

---

### Method 2: Deploy with Docker / Docker Compose (Any VPS / DigitalOcean / EC2)

The project includes an optimized multi-stage [`Dockerfile`](Dockerfile) and [`docker-compose.yml`](docker-compose.yml):

```bash
# 1. Connect to your server via SSH and clone
git clone https://github.com/YogenderVermaa/graa-ai.git
cd graa-ai/graa-ai

# 2. Configure environment
cp .env.example .env
nano .env # Paste your database and API keys

# 3. Push database schema
npx prisma db push

# 4. Start production container in background
docker-compose up -d --build
```
Your app is now live at `http://your-server-ip:3000`.

---

### Method 3: Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and click **Add New → Project**.
2. Import `YogenderVermaa/graa-ai`.
3. Under **Environment Variables**, paste all the variables from your `.env`.
4. Set `NEXTAUTH_URL` to `https://your-vercel-domain.vercel.app`.
5. Click **Deploy**.

---

## 🎯 What Graa AI Does (Feature Tour)

### 1. 📤 Syllabus & Large Textbook Processing (Up to 50MB+)
- Users can upload entire multi-chapter university textbooks (PDF, Word `.docx`, or Markdown).
- **Client-Side PDF.js Engine**: Decodes the PDF directly in the user's browser, pulling out the Table of Contents, Unit outlines, and chapters in **~1.5 seconds**.
- **Interactive "Behind the Scenes" Visualizer**: Shows live terminal telemetry, an elapsed timer, stage checklist, and study tips while generating the roadmap in **~3.5 seconds**.

### 2. 🗺️ Gated Day-by-Day Learning Loop
- Each day includes:
  - 🎥 **Curated Video Lesson**: Goal-aligned YouTube tutorial matching the exact day's topic.
  - 📖 **AI-Synthesized Lesson**: Formatted reading covering core theory.
  - 📝 **70% Gated MCQ Quiz**: Pass with at least 70% to unlock practice.
  - 💻 **Interactive Code Playground**: Monaco editor supporting 11 programming languages with Run, progressive Hints, and automated AI review.
  - 🔒 **Gated Progression**: Day $N+1$ unlocks only when Day $N$ is completed.

### 3. 📊 Overall Cross-Goal Performance Dashboard (`/dashboard/performance`)
- **Mastery Radar Chart**: Assesses Consistency, Velocity, Accuracy, Depth, Problem Solving, and Retention.
- **Activity Heatmap**: Tracks learning streaks and study days.
- **Subject Breakdown**: Visualizes completion and quiz accuracy across subjects.

### 4. 🤖 Context-Aware AI Mentor (Graa)
- Available on every lesson page.
- Grounded directly in the user's active syllabus via **Retrieval-Augmented Generation (RAG)** using PostgreSQL `pgvector` and Jina AI embeddings.

---

## 📁 Repository Directory Structure

```
graa-ai/
├── app/
│   ├── page.tsx                     # Landing page with interactive hero
│   ├── login/ & register/           # NextAuth credentials & Google login
│   ├── dashboard/                   # Main dashboard (Goal cards, stats, curriculum upload)
│   │   └── performance/             # Cross-goal performance & mastery analytics
│   ├── goals/[id]/                  # Interactive roadmap view (phases, milestones, days)
│   │   └── day/[day]/               # Day learning interface (Video, AI lesson, Quiz, Sandbox)
│   ├── profile/                     # User preferences & learning style settings
│   └── api/
│       ├── auth/[...nextauth]/      # NextAuth authentication endpoints
│       ├── curriculum/parse/        # Curriculum parser & atomic roadmap creator
│       ├── performance/             # Performance analytics aggregation API
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
├── docker-compose.yml               # Production container runner
├── AWS_DEPLOYMENT.md                # Dedicated step-by-step AWS deployment guide
└── next.config.ts                   # Next.js config with standalone output enabled
```

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><b>1. Do I need to pay for any services to host this?</b></summary>
No. Neon provides a free PostgreSQL database, Groq provides generous free AI inference, Jina provides 10M free tokens, and Vercel/App Runner have free tiers. You can run Graa AI completely free of cost.
</details>

<details>
<summary><b>2. Why is there no separate Python microservice needed?</b></summary>
We upgraded the document architecture: large 50MB PDFs are decoded directly inside the user's browser using WebAssembly PDF.js. The browser extracts the Table of Contents outline (~20KB) and sends it as text. Any server fallback is handled natively in Node.js using <code>pdf-parse</code>.
</details>

<details>
<summary><b>3. What should I do if database changes are made?</b></summary>
Whenever <code>prisma/schema.prisma</code> is updated, run <code>npx prisma db push</code> to apply the latest tables and indexes to your database.
</details>

<details>
<summary><b>4. How do I change the AI model?</b></summary>
In your <code>.env</code> file, update <code>GROQ_MODEL</code>. We recommend <code>qwen/qwen3.8-27b</code> for ultra-fast ~3.2s roadmap generation.
</details>

---

## 📜 License & Credits

- **License**: MIT License (Open Source — free for personal and commercial use).
- **Author**: [Yogender Verma](https://github.com/YogenderVermaa)
- **Repository**: [https://github.com/YogenderVermaa/graa-ai](https://github.com/YogenderVermaa/graa-ai)
