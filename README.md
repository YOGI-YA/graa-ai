# Graa AI 🔥

Turn any goal into a **day-by-day learning roadmap** — with curated lessons, quizzes that gate your progress, a real in-browser code playground, and an AI mentor that actually knows what you're learning. Learning that's focused, practical, and finishable.

Built to run on a **100% free stack**.

---

## The learning loop

```
Set a goal (+ optional days/skill)
        │  AI sizes the timeline if you don't
        ▼
Day-by-day roadmap (N daily tasks)
        ▼
Learning page per day  ── curated YouTube video + docs + an AI-written lesson
        ▼
MCQ quiz (≥70% to pass)  ── pass to unlock the day's practice
        ▼
Code playground  ── write code, Run it (11 languages), reveal Hints, Submit for AI review
        ▼
Day auto-completes → the next day unlocks
        ▲
   AI mentor (Graa) on every page — answers grounded in YOUR curriculum (RAG)
```

A day unlocks **only** when the previous day is complete.

---

## AI models

| Purpose | Provider | Model |
|---|---|---|
| All text generation — roadmaps, lessons, quizzes, practice tasks, hints, submission grading, chat, feedback | **Groq** | **Llama 3.3 70B Versatile** (`llama-3.3-70b-versatile`) |
| Embeddings for RAG (grounds the mentor in your curriculum) | **Jina AI** | **jina-embeddings-v3** (384-dim) |

Both are swappable via env. Groq is OpenAI-compatible; the embeddings endpoint is any OpenAI-compatible `/embeddings` API.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 (custom "ember" design system) |
| Database | Neon **PostgreSQL** + **pgvector** (RAG vector store) |
| ORM | Prisma 5 |
| LLM | Groq · Llama 3.3 70B |
| Embeddings | Jina · jina-embeddings-v3 |
| Auth | NextAuth v4 (JWT) — credentials + **Google OAuth** |
| Code editor | Monaco (`@monaco-editor/react`) |
| Code execution | Paiza.io (free, no key) — or self-hosted Piston via `PISTON_URL` |
| Content sourcing | DuckDuckGo HTML + YouTube + Cheerio (scraped, cached per day) |

Every external service has a free tier; total run cost can be **$0**.

---

## Features

- 🗺️ **Day-by-day roadmaps** — describe a goal; AI generates a realistic per-day curriculum (and infers the duration if you don't give one). Long roadmaps are auto-filled in batches so they're never truncated.
- 📚 **Curated daily content** — each day pulls the best-matching YouTube tutorial, doc links, and an AI-written lesson grounded in the scraped sources. Cached per day, so the web is hit once.
- 🎓 **Quizzes that gate** — a 5-question MCQ after each lesson; pass (≥70%) to unlock the day's practice. Answers are graded server-side.
- 🧑‍💻 **Real code playground** — Monaco editor, 11 languages (JS, TS, Python, Java, C++, C, Go, Rust, Ruby, PHP, C#), **Run** with live output, progressive **Hints**, and **Submit** for AI grading. Passing marks the day complete.
- 🔒 **Progress gating** — finish a day to unlock the next; locked days show clearly in the roadmap.
- 🤖 **AI mentor (Graa)** — a draggable, always-available chat that streams answers **grounded in your curriculum via RAG** (pgvector + Jina embeddings).
- 📊 **Product dashboard** — "Continue learning" resume hero, progress stats, and a goals overview.
- 🔐 **Auth** — email/password or **Sign in with Google**; per-user learning-style profile.

---

## Quick start

### 1. Install
```bash
npm install
```

### 2. Environment (`.env`)
```env
# Public production URL used for SEO metadata, sitemap, and canonical URLs
NEXT_PUBLIC_SITE_URL="https://graaai.vercel.app"

# Database (Neon or any Postgres; pgvector enabled automatically)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# LLM — Groq (free at console.groq.com)
GROQ_API_KEY="gsk_..."
GROQ_MODEL="llama-3.3-70b-versatile"

# Embeddings for RAG — Jina (free at jina.ai/embeddings). Leave key empty to disable RAG.
EMBEDDINGS_API_URL="https://api.jina.ai/v1/embeddings"
EMBEDDINGS_API_KEY="jina_..."
EMBEDDINGS_MODEL="jina-embeddings-v3"
EMBEDDING_DIM="384"

# Auth
NEXTAUTH_SECRET="any-random-32-char-string"   # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"           # set to your prod URL in production

# Google OAuth (optional — enables "Sign in with Google")
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Optional: self-hosted Piston for scalable code execution (defaults to Paiza.io)
# PISTON_URL="https://piston.example.com/api/v2/piston"
```

### 3. Database
```bash
npx prisma db push      # also enables the pgvector extension via the schema
```

### 4. Run
```bash
npm run dev             # development (http://localhost:3000)
# or
npm run build && npm run start   # production build (much faster — use this to judge real speed)
```

> Note: `npm run build` runs `prisma generate` first (also configured as a `postinstall`), so deployments always get a fresh Prisma Client.

---

## Deploying to Vercel

1. Import the repo; framework preset **Next.js**.
2. Add **all** env vars above in **Project → Settings → Environment Variables**.
3. Set `NEXTAUTH_URL` to your real domain, e.g. `https://graaai.vercel.app` (no trailing slash).
4. **Google OAuth** — in Google Cloud Console, add:
   - Authorized JavaScript origin: `https://<your-domain>`
   - Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
   - If the consent screen is in "Testing", add your account as a test user (or publish).
5. Redeploy after any env change.

The build already runs `prisma generate`, which avoids the common "Prisma Client not generated" error on Vercel's cached installs.

---

## Project structure

```
app/
  page.tsx                       # Landing page
  login/ register/               # Auth (compact split-screen)
  dashboard/                     # Home: resume hero, stats, goals
  goals/                         # Goals list
  goals/[id]/                    # Roadmap (phases + daily lessons grid)
  goals/[id]/day/[day]/          # Learning page (video/docs/lesson → quiz → practice)
  profile/                       # Profile + learning style
  api/
    auth/[...nextauth]/          # NextAuth (credentials + Google)
    register/  profile/          # Account
    goals/  goals/[id]/          # Goal CRUD + listing
    goals/[id]/day/[day]/        # Day content (scrape + lesson, cached; ?refresh=1)
    goals/[id]/day/[day]/quiz/   # Quiz generate + grade
    goals/[id]/day/[day]/practice/  # Practice task + AI submission grading
    roadmap/                     # Roadmap draft generation
    chat/                        # Streaming RAG mentor
    run/                         # Multi-language code execution (Paiza/Piston)

components/
  Logo, AppNav, Aurora           # Brand + shell
  EmptyRoadmapBuilder            # Goal composer
  RoadmapGraph                   # Roadmap + daily lessons (with gating)
  DayLearning                    # Per-day learning page
  QuizPanel, PracticeSandbox, CodePlayground
  ChatLauncher, ChatPanel        # Draggable AI mentor
  Toast                          # Toasts + confirm dialog
  GoalCard, NewGoalModal, GoogleButton, AuthShell

lib/
  groq.ts                        # All LLM functions (Groq)
  embeddings.ts                  # Hosted embeddings client
  rag.ts                         # pgvector index + retrieve
  scrape.ts                      # DuckDuckGo + YouTube + readability
  prisma.ts  auth.ts             # DB client + NextAuth config

prisma/schema.prisma             # Data model
```

---

## Open source

Graa AI is open source under the [MIT License](LICENSE). You are welcome to use, modify, and distribute it, including for commercial projects, subject to the license terms.

### Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request, and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

If you discover a security vulnerability, please follow the private reporting guidance in [SECURITY.md](SECURITY.md) rather than opening a public issue.

---

## Data model

- **User** — email, name, password?, image?, learningStyle, (Google OAuth supported)
- **Goal** — title, description, category, durationDays, skillLevel, planJson, status
- **Task** — one per day (day, week, phase, title, description, type, completed)
- **DayContent** — cached per (goal, day): video, docs, lesson text, practice task
- **Quiz** / **QuizAttempt** — per-day MCQs + graded attempts
- **ContentChunk** — pgvector store (`vector(384)`) for RAG
- **Milestone** / **Resource** — roadmap phases + curated resources

---

Made with Groq, Jina, Neon, and a lot of free tiers. 🔥
