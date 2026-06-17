# AI Goal Mentor 🧠

An intelligent, AI-powered learning platform that transforms how users set, track, and achieve their learning goals through personalized guidance and adaptive feedback.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| AI | Groq API (LLaMA 3 8B) |
| Auth | NextAuth.js v4 (JWT) |
| Password | bcryptjs |

## Features

- 🎯 **Smart Goal Decomposition** — Describe a goal in natural language; AI generates 4-6 structured milestones with timelines
- 📚 **Resource Curation** — AI curates books, courses, videos, and tools matched to each goal
- 🤖 **Adaptive Feedback** — Milestone completion triggers personalized coaching messages
- 💬 **AI Chat Mentor** — Context-aware conversational coach powered by LLaMA 3
- 📊 **Progress Dashboard** — Visual stats, progress bars, and analytics
- 🔐 **Auth** — Secure JWT-based login/register with learning style profiles

## Quick Start

### 1. Clone & Install

```bash
npm install
```

### 2. Set up environment

Copy `.env.local` and fill in your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ai_goal_mentor"
GROQ_API_KEY="your_groq_api_key"           # get from console.groq.com
NEXTAUTH_SECRET="any-random-32-char-string"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Set up database

```bash
# Push schema to your PostgreSQL database
npx prisma db push

# Optional: open Prisma Studio to browse data
npx prisma studio
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Getting a Groq API Key

1. Sign up at [console.groq.com](https://console.groq.com)
2. Go to API Keys → Create New Key
3. Paste it in `.env.local` as `GROQ_API_KEY`

Groq is free to start and extremely fast (millisecond inference with LLaMA 3).

## Project Structure

```
app/
  page.tsx              # Landing page
  login/page.tsx        # Sign in
  register/page.tsx     # Sign up with learning style
  dashboard/page.tsx    # Main app dashboard
  api/
    auth/               # NextAuth endpoints
    register/           # User registration
    goals/              # CRUD + AI goal creation
    milestones/[id]/    # Milestone status updates
    chat/               # AI mentor chat

components/
  GoalCard.tsx          # Goal display with milestones & resources
  NewGoalModal.tsx      # Goal creation with AI generation
  ChatPanel.tsx         # Floating AI chat interface

lib/
  prisma.ts             # Database client
  groq.ts               # AI functions (goals, feedback, chat)
  auth.ts               # NextAuth config

prisma/
  schema.prisma         # Database schema
```

## Database Schema

- **User** — email, name, password, learningStyle
- **Goal** — title, description, category, targetDate, status
- **Milestone** — title, description, dueDate, status, order
- **Resource** — title, url, type (book/course/video/article/tool/practice)
