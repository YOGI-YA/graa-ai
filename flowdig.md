# Graa AI Project Flow Guide

This document explains the complete architecture and working flow of the Graa AI project in a simple, presentation-friendly format.

---

## 1. Project Overview

Graa AI is a learning platform where a user sets a goal, and the application creates a personalized day-by-day learning roadmap. The user then learns one day at a time, completes quizzes, works on practice tasks, and can ask an AI mentor questions grounded in their own curriculum.

In simple terms:

- User enters a learning goal
- AI creates a plan
- App saves the plan to the database
- Each day generates learning content
- The user completes tasks and quizzes
- AI mentor answers based on the actual course material

This is not just a chatbot app. It is a full learning loop: plan → learn → test → practice → ask questions.

---

## 2. Tech Stack

The project uses a modern full-stack setup:

- Frontend: Next.js
- Backend: Next.js API routes
- Database: PostgreSQL via Prisma ORM
- Authentication: NextAuth
- AI generation: Groq and NVIDIA fallback
- Embeddings + RAG: pgvector + external embedding API
- Search/web scraping: custom scraping logic

Main project files:

- App routes: app/
- Shared logic: lib/
- Database schema: prisma/schema.prisma
- UI components: components/

---

## 3. Application Architecture

The app is structured around a few major layers:

### 3.1 Frontend Layer
The frontend is built using Next.js pages and reusable components.

Examples:

- Landing page: app/page.tsx
- Login page: app/login/page.tsx
- Register page: app/register/page.tsx
- Dashboard: app/dashboard/page.tsx
- Goal detail / roadmap page: app/goals/[id]/page.tsx
- Daily learning page: app/goals/[id]/day/[day]/page.tsx

This layer handles:

- user interface
- form submission
- navigation
- fetching data from APIs
- rendering AI-generated learning content

### 3.2 API Layer
The backend is implemented in Next.js route handlers under app/api/.

Examples:

- app/api/register/route.ts → user signup
- app/api/goals/route.ts → create and fetch goals
- app/api/roadmap/route.ts → generate roadmap draft
- app/api/goals/[id]/day/[day]/route.ts → fetch day lesson data
- app/api/chat/route.ts → AI mentor chat

This layer is where application logic is enforced:

- user must be authenticated
- user can only access their own goal data
- AI generation is called with user-specific prompt context
- database writes happen here

### 3.3 Data / Persistence Layer
This is handled by Prisma and PostgreSQL.

The schema is defined in prisma/schema.prisma.

Key models:

- User
- Goal
- Task
- Milestone
- Resource
- DayContent
- Quiz
- QuizAttempt
- ContentChunk

This persistence layer stores:

- users and login info
- roadmap data
- daily tasks
- learning resources
- lesson content cache
- quiz results
- vector chunks for RAG

### 3.4 AI Layer
The AI logic is centralized in lib/groq.ts.

This file contains:

- Groq request logic
- model fallback chain
- roadmap generation prompts
- lesson generation prompts
- quiz generation logic
- practice task generation logic

The app uses multiple AI flows:

- generate roadmap from a user goal
- generate day-specific lesson content
- generate quiz questions
- generate practice tasks or coding tasks
- generate AI mentor answers

### 3.5 Retrieval Layer (RAG)
The retrieval flow is handled by lib/rag.ts and lib/embeddings.ts.

This layer stores content chunks as vector embeddings and retrieves the most relevant ones for user questions.

This gives the AI mentor context from the learner’s actual curriculum rather than generic answers.

---

## 4. Authentication Flow

Authentication is configured in lib/auth.ts.

### What it does

- Uses NextAuth Credentials Provider for email/password login
- Supports Google login if configured with env vars
- Stores session info and user id in JWT/session
- Protects user-specific routes

### Flow

1. User enters email and password on login page
2. API verifies credentials against database
3. If correct, NextAuth creates session
4. Session stores user id
5. API routes check session.user.id before allowing access

This ensures users can only access their own goals and data.

---

## 5. User Registration Flow

Register flow:

1. User visits app/register/page.tsx
2. Form sends POST to app/api/register/route.ts
3. Route checks if email already exists
4. Password is hashed with bcrypt
5. User row is created in PostgreSQL
6. User is redirected to login page

This gives the app its basic identity layer.

---

## 6. Roadmap Creation Flow

This is the core product logic.

### Step-by-step

1. User types a goal like “Learn Python for data analysis in 30 days”
2. Frontend sends prompt to app/api/roadmap/route.ts
3. App loads the user’s learning style from the database
4. It calls generateRoadmapDraft() from lib/groq.ts
5. The AI is prompted to return valid JSON with:
   - title
   - description
   - category
   - milestones
   - resources
   - days
   - advice
6. The backend normalizes and validates the AI output
7. The user can preview the roadmap
8. On “Begin”, app saves the roadmap into database through app/api/goals/route.ts

This creates:

- a Goal record
- Milestone rows
- Resource rows
- Task rows (one per day)

The roadmap becomes persistent and trackable.

---

## 7. Goal Dashboard Flow

Once a user has one or more goals, the dashboard fetches them from app/api/goals/route.ts.

This route:

- gets the current session
- ensures the user is authenticated
- queries Prisma for all goals belonging to that user
- returns the data with milestones, tasks, resources

The frontend renders progress cards and goal summaries.

Users can see:

- number of goals
- milestone status
- day progress
- tracked completion state

---

## 8. Day-by-Day Learning Flow

When a user opens a goal and selects a day, the app loads the day’s learning content.

### Day content generation pipeline

1. User opens day page
2. Frontend calls app/api/goals/[id]/day/[day]/route.ts
3. Server verifies the goal belongs to the signed-in user
4. Check if content is already cached in DayContent
5. If not cached:
   - determine the learning topic from the task title/description
   - scrape or collect relevant sources from the web
   - generate a day lesson with AI
   - save the lesson, docs, and video in the database
6. Return the lesson content to the frontend

The app uses cached DayContent to avoid regenerating the same lesson repeatedly.

The content usually contains:

- a video recommendation
- linked docs/resources
- a written lesson summary
- sections and explanations
- key takeaways
- a practice hint

This makes each day a mini learning session.

---

## 9. Quiz Flow

After each day’s lesson, the user is expected to test understanding.

### How it works

- The app generates a quiz for the day using AI
- Quiz data is stored in the Quiz table
- Frontend renders questions with multiple choices
- User answers questions
- Backend evaluates score
- The result is stored in QuizAttempt
- If passed, the practice section is unlocked

This ensures knowledge is checked before the learner moves forward.

---

## 10. Practice Flow

The practice flow is designed to enforce real learning and output.

### Flow

1. Quiz passes
2. Practice assignment unlocks
3. User opens coding or project exercise
4. UI loads a sandbox / starter code
5. User works on the task
6. User submits their solution
7. API evaluates the solution
8. If correct, the day is marked complete

This is important because it ensures the learner isn’t just reading passively; they actually do the work.

---

## 11. AI Mentor Chat Flow

The AI mentor is a special feature that answers based on the learner’s actual study material.

### What happens

1. User opens chat panel
2. Chat sends messages to app/api/chat/route.ts
3. API checks if the goal belongs to the user
4. It finds the most recent user question
5. It calls retrieve(goalId, query, 5)
6. The retrieval layer finds the most similar content chunks from the vector store
7. Relevant chunks are injected into the AI prompt as context
8. The LLM answers grounded in this content

### Why this matters

This makes the chat specific to the user’s roadmap and not generic. It acts like a personal tutor for the user’s learning path.

---

## 12. RAG and pgvector Workflow

This is one of the most important parts of the system.

### Step-by-step

1. After a day is generated, lesson content is prepared
2. Text is split into smaller chunks
3. Each chunk is converted into an embedding using an embedding API
4. The embedding is stored in PostgreSQL with pgvector support
5. When the user asks a question, that question is also embedded
6. The database compares vector similarity
7. The most relevant content chunks are returned
8. Those chunks are passed to the AI model as context
9. The AI gives a grounded answer

### Why use RAG?

Because generic AI may answer with broad or incorrect information. RAG fixes this by tying the answer to the specific content the user is learning.

This is ideal for an educational assistant.

---

## 13. Embeddings Layer

The embedding logic is in lib/embeddings.ts.

It is designed to work with OpenAI-compatible embedding APIs, and the project defaults to Jina embeddings.

Important configuration variables:

- EMBEDDINGS_API_URL
- EMBEDDINGS_API_KEY
- EMBEDDINGS_MODEL
- EMBEDDING_DIM

If no API key is supplied, embeddings are disabled gracefully.

This means the app still works, but the mentor chat loses the curriculum-grounded context.

---

## 14. Groq AI Model Flow

The AI generation logic is in lib/groq.ts.

### Model setup

The app sets a default Groq model:

- llama-3.1-8b-instant

It also defines fallback models:

- llama-3.1-8b-instant
- llama-3.3-70b-versatile

This means the app tries a preferred model first, then a fallback model if the first one fails or rate-limits.

### Why this matters

- smaller models are cheaper and faster
- bigger models are more powerful but may be slower or more expensive
- fallback keeps the app resilient when one provider/model is overloaded

The app also includes a fallback to NVIDIA if Groq is unavailable.

---

## 15. Full End-to-End User Experience

Here is the overall experience from the user’s perspective:

1. Sign up
2. Log in
3. Enter a goal
4. AI builds a roadmap
5. Roadmap is saved and shown on dashboard
6. Learn one day at a time
7. Watch/read lesson material
8. Pass quiz
9. Solve practice task
10. Ask mentor chat questions
11. Continue to next day
12. Progress is tracked over time

This is a very complete learning system, not just a simple AI demo.

---

## 16. Key Design Principles in the Project

### Personalization
The app uses:

- user profile
- learning style
- specific goal context
- per-day content personalization

### Persistence
Everything is stored in the database, so progress is not lost.

### AI-guided learning
The app generates structured content instead of requiring manual course creation.

### Grounded assistance
The mentor chat uses RAG to answer using the learner’s own materials.

### Practical learning
The app goes beyond reading by including exercises and coding tasks.

---

## 17. Business Logic Summary

The business idea behind the project is:

- make learning structured and personalized
- reduce overwhelm by breaking goals into daily steps
- use AI to create and adapt learning paths
- remove unnecessary searching by curating helpful resources
- test understanding through quizzes and hands-on work
- provide an always-available tutor for support

This transforms the traditional “learn by random internet content” model into a guided learning system.

---

## 18. Final Takeaway

Graa AI can be described as an AI-powered learning coach and roadmap generator.

Its core architecture is:

- Next.js frontend
- Prisma + PostgreSQL database
- NextAuth for authentication
- Groq/NVIDIA for AI generation
- pgvector + embeddings for semantic retrieval
- RAG-driven mentor chat
- structured learning flow with tasks, quizzes, and practice

This project is a strong example of an AI educational product that combines:

- planning
- content generation
- knowledge indexing
- retrieval-based tutoring
- practical activity tracking

---

## 19. Presentation-Friendly Short Summary

If you need a one-line summary for a PPT:

“Graa AI is an AI-powered personalized learning platform that converts user goals into roadmap-based daily lessons, uses Groq-powered generation for content creation, stores learning material in PostgreSQL, and leverages pgvector-based RAG to provide context-aware mentor support throughout the learner journey.”

---

## 20. Main Files to Refer in a Presentation

- app/page.tsx — product landing page
- app/register/page.tsx — signup flow
- app/login/page.tsx — login flow
- app/api/goals/route.ts — goal creation and listing
- app/api/roadmap/route.ts — AI roadmap generation
- app/api/goals/[id]/day/[day]/route.ts — day lesson generation and content caching
- lib/groq.ts — AI generation and model fallback
- lib/embeddings.ts — embedding generation
- lib/rag.ts — vector storage and retrieval
- app/api/chat/route.ts — RAG-based mentor chat
- prisma/schema.prisma — database model architecture

This file is a clean starting point for your PPT and for explaining the whole system architecture clearly.
