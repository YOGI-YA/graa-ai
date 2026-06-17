# AI Goal Mentor — Architecture & Build Plan

> Status: planning. Decisions locked: **Minimal DB + RAG** for context, **embedded sandbox** for practice, **full plan before build**.

## 1. Product flow (target)

```
Goal input (+ optional days)
   │  if no days → infer reasonable duration
   ▼
Generate day-by-day roadmap (N days)
   │
   ├── Roadmap page (overview graph/timeline)  ── Chat mentor (doubts, Q&A)
   │
   ▼
Learning page (per day)
   │   structured content scraped from web: VIDEO + DOCS + TEXT
   ▼
MCQ test (short, based on the day's content)
   │   pass → unlock
   ▼
Practice environment (embedded sandbox)
   │   do the real task for the day
   ▼
Mark day complete → next day
```

## 2. The "don't store everything / serve a link to the AI" idea → Minimal DB + RAG

Your instinct (don't re-send the user's whole history to the API every call) is right. The token-efficient version of that is **RAG**:

- **Store little in Postgres** — only durable pointers and progress state (goal, day index, completion, MCQ scores).
- **Heavy content** (scraped articles, transcripts, the generated daily lessons) is **chunked + embedded into a vector store**. We use **pgvector** inside the existing Postgres — no new infrastructure.
- On each AI call (chat mentor, MCQ generation, grading) we **retrieve only the relevant chunks** for that day/question and pass those — not the entire roadmap. This is what makes it cheap and scalable.
- The "link that contains the whole context" becomes an internal **context reference** (goalId + day) that the retrieval layer expands into exactly the chunks needed.

Why pgvector over a stateless signed link: an LLM that can't fetch URLs still needs the text inlined; a giant signed blob would blow the token budget on every call. RAG gives us the "serve only what's needed" property you actually want.

## 3. Data model (Prisma) — reconcile schema with existing code first

The code already references fields the schema lacks. Target schema:

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  password      String
  learningStyle String?
  nvidiaApiKey  String?   // referenced by roadmap route today — add it
  nvidiaModel   String?
  goals         Goal[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Goal {
  id           String      @id @default(cuid())
  title        String
  description  String
  category     String
  durationDays Int?         // NEW — total roadmap length
  skillLevel   String?      // NEW — beginner/intermediate/advanced
  planJson     Json?        // NEW — generated roadmap snapshot
  targetDate   DateTime?
  status       GoalStatus  @default(ACTIVE)
  userId       String
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  milestones   Milestone[]
  resources    Resource[]
  tasks        Task[]       // NEW — daily tasks
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model Task {            // NEW — one row per day (or per item within a day)
  id          String   @id @default(cuid())
  day         Int
  week        Int?
  phase       String?
  title       String
  description String
  type        String    // lesson | video | doc | practice
  platform    String?   // youtube | mdn | ...
  url         String?
  completed   Boolean  @default(false)
  goalId      String
  goal        Goal     @relation(fields: [goalId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}

model DayContent {     // NEW — cached scraped/curated content per day (so we scrape once)
  id        String   @id @default(cuid())
  goalId    String
  day       Int
  video     Json?     // {title,url,channel,thumbnail}
  docs      Json?     // [{title,url,source}]
  text      Json?     // structured lesson text/sections
  createdAt DateTime @default(now())
  @@unique([goalId, day])
}

model Quiz {           // NEW — MCQ test per day
  id        String   @id @default(cuid())
  goalId    String
  day       Int
  questions Json      // [{q, options[], answerIndex, explanation}]
  createdAt DateTime @default(now())
}

model QuizAttempt {    // NEW — progress/gate
  id        String   @id @default(cuid())
  goalId    String
  day       Int
  userId    String
  score     Int
  passed    Boolean
  createdAt DateTime @default(now())
}

model ContentChunk {   // NEW — RAG store (requires pgvector extension)
  id        String                 @id @default(cuid())
  goalId    String
  day       Int?
  source    String                 // url or "lesson"
  content   String
  embedding Unsupported("vector")? // pgvector
  createdAt DateTime               @default(now())
}
```

Enable pgvector: `CREATE EXTENSION IF NOT EXISTS vector;` (migration).

## 4. Components & pipelines

### 4.1 Roadmap generation (upgrade existing `lib/groq.ts`)
- Input: goal, optional `durationDays`, optional `skillLevel`.
- **If no days:** model infers a reasonable duration from scope (with sane clamps, e.g. 7–90).
- Output: per-day plan → write `Goal.planJson` + `Task` rows.
- Fix the signature/route mismatch (`generateRoadmapDraft` 4th options arg) as part of this.

### 4.2 Web scraping → daily content (NEW `lib/scrape.ts`)
- **Search:** a search API (Tavily / Brave / SerpAPI) to find docs+articles per day topic.
- **Video:** YouTube Data API → pick best tutorial for the day.
- **Extract:** fetch pages → readability/cheerio → clean text.
- **Cache:** write to `DayContent` so we scrape each day only once.
- **Index:** chunk + embed cleaned text → `ContentChunk` (RAG).
- Run lazily (on first visit to a day) or as a background job after roadmap creation.

### 4.3 RAG retrieval (NEW `lib/rag.ts`)
- `embed(text)` via NVIDIA embeddings.
- `retrieve(goalId, day, query, k)` → top-k chunks via pgvector cosine.
- Used by chat mentor, MCQ generation, and answer grading.

### 4.4 MCQ test (NEW `lib/quiz.ts` + `app/api/quiz`)
- Generate N MCQs from the day's retrieved content; store in `Quiz`.
- Grade client answers → `QuizAttempt`; pass threshold gates the practice env.

### 4.5 Practice environment (embedded sandbox)
- Embed **StackBlitz SDK** (WebContainers, runs in-browser, no backend) for coding goals; CodeSandbox/Replit as alternatives.
- Seed the sandbox with a starter template + the day's task prompt.
- Optional: AI review of the user's submitted solution (via RAG context).

### 4.6 Chat mentor (upgrade existing)
- Keep `chatWithMentor` but feed it **retrieved chunks** for the current goal/day instead of dumping full context → cheaper, more grounded.

## 5. Pages / routes
- `/goals/new` (or modal) → goal + days + skill level
- `/goals/[id]` → roadmap overview + chat (exists; wire to new data)
- `/goals/[id]/day/[day]` → **learning page** (video/docs/text) → MCQ → sandbox (NEW)
- API: `/api/roadmap` (fix), `/api/scrape`, `/api/rag`, `/api/quiz`, `/api/quiz/attempt`, `/api/chat` (upgrade)

## 6. External services / keys needed
- ✅ NVIDIA API (chat + embeddings) — present
- ➕ Search API key (Tavily or Brave or SerpAPI)
- ➕ YouTube Data API key
- ➕ StackBlitz (SDK is free; no key for basic embed)
- ✅ Postgres + **pgvector extension**

## 7. Build order (phased)
1. **Phase 0 — Unbreak:** migrate schema to match existing code (`durationDays`, `skillLevel`, `planJson`, `Task`, `nvidiaApiKey/Model`); fix `generateRoadmapDraft` signature. App compiles & runs.
2. **Phase 1 — Daily roadmap:** roadmap generation produces N daily `Task`s incl. duration inference.
3. **Phase 2 — Learning page + scraping:** `/day/[day]` page + `lib/scrape.ts` + `DayContent` cache.
4. **Phase 3 — RAG:** pgvector + `lib/rag.ts`; rewire chat mentor to use retrieval.
5. **Phase 4 — MCQ:** quiz generation, grading, gating.
6. **Phase 5 — Practice sandbox:** StackBlitz embed + task seeding + (optional) AI review.
7. **Phase 6 — Polish:** progress tracking, unlock flow, error/empty states.

## 8. Open questions
- Search provider preference (Tavily is simplest for LLM use)?
- Scrape eagerly (background after roadmap) or lazily (on day open)?
- MCQ pass threshold + retry policy?
- Non-coding goals: does the sandbox fall back to "task + AI-graded submission"?
```
