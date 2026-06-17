import axios from 'axios'

// Groq is OpenAI-compatible and free-tier friendly. Chat only (no embeddings).
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

async function createChatCompletion(
  messages: ChatMessage[],
  options: { maxTokens: number; temperature: number; apiKey?: string; model?: string }
): Promise<string> {
  const apiKey = options.apiKey || process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured')

  const response = await axios.post<GroqChatResponse>(
    GROQ_URL,
    {
      model: options.model || DEFAULT_MODEL,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: 0.95,
      stream: false,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data.choices?.[0]?.message?.content?.trim() || ''
}

export interface MilestoneItem {
  title: string
  description: string
  dueDate?: string
  order: number
}

export interface ResourceItem {
  title: string
  url?: string
  type: string
}

export interface DailyTaskItem {
  day: number
  week?: number
  phase?: string
  title: string
  description: string
  type: string // lesson | practice | review | project
}

export interface RoadmapDraft {
  title: string
  description: string
  category: string
  targetDate?: string | null
  durationDays?: number | null
  skillLevel?: string | null
  milestones: MilestoneItem[]
  resources: ResourceItem[]
  days?: DailyTaskItem[]
  advice: string
}

export const MIN_DURATION_DAYS = 7
export const MAX_DURATION_DAYS = 90

/** Clamp a requested duration into a sane, token-bounded range. */
export function clampDuration(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(MAX_DURATION_DAYS, Math.max(MIN_DURATION_DAYS, Math.round(n)))
}

export interface RoadmapOptions {
  durationDays?: number | null
  skillLevel?: string | null
  apiKey?: string
  model?: string
}

function parseRoadmapJson(content: string): RoadmapDraft {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse AI response')
  return JSON.parse(jsonMatch[0])
}

export async function generateRoadmapDraft(
  prompt: string,
  existingRoadmap?: RoadmapDraft,
  learningStyle?: string,
  options: RoadmapOptions = {}
): Promise<RoadmapDraft> {
  const { skillLevel, apiKey, model } = options
  const durationDays = clampDuration(options.durationDays)

  const durationLine = durationDays
    ? `Total duration: ${durationDays} days. Produce a day-by-day plan with EXACTLY ${durationDays} entries in "days" (day 1 through ${durationDays}), and set "durationDays" to ${durationDays}.`
    : `No duration was given. Infer a reasonable duration between ${MIN_DURATION_DAYS} and ${MAX_DURATION_DAYS} days based on scope, set "durationDays" to that number, and produce one "days" entry per day for the whole duration.`

  const roadmapPrompt = existingRoadmap
    ? `You are an expert learning coach. Update this roadmap based on the user's requested change.

User request: ${prompt}
${learningStyle ? `Learning style: ${learningStyle}` : ''}
${skillLevel ? `Skill level: ${skillLevel}` : ''}
${durationLine}

Existing roadmap:
${JSON.stringify(existingRoadmap, null, 2)}

Respond ONLY with a valid JSON object in the exact format below. Keep what still works, revise what should change, and make the plan practical.`
    : `You are an expert learning coach. Turn the user's goal into a practical learning roadmap.

User goal: ${prompt}
${learningStyle ? `Learning style: ${learningStyle}` : ''}
${skillLevel ? `Skill level: ${skillLevel}` : ''}
${durationLine}

Respond ONLY with a valid JSON object in the exact format below. Infer a concise title, useful category, and realistic milestones.`

  const content = await createChatCompletion([{ role: 'user', content: `${roadmapPrompt}

{
  "title": "short goal title",
  "description": "clear 1-2 sentence description of the outcome",
  "category": "Programming|Data Science|Design|Language|Business|Mathematics|Science|Arts|Health|Other",
  "targetDate": null,
  "durationDays": ${durationDays ?? 'a reasonable integer'},
  "skillLevel": ${skillLevel ? `"${skillLevel}"` : '"beginner|intermediate|advanced"'},
  "milestones": [
    {
      "title": "milestone title",
      "description": "what to do and why",
      "dueDate": null,
      "order": 1
    }
  ],
  "resources": [
    {
      "title": "resource name",
      "url": null,
      "type": "book|course|video|article|tool|practice"
    }
  ],
  "days": [
    {
      "day": 1,
      "week": 1,
      "phase": "name of the milestone/phase this day belongs to",
      "title": "concrete focused topic for this day",
      "description": "1 sentence on exactly what to learn/do this day",
      "type": "lesson|practice|review|project"
    }
  ],
  "advice": "2-3 sentences of personalized coaching advice"
}

Generate 4-6 milestones and 3-5 resources. The "days" array must cover every single day in order, each mapping to the relevant milestone/phase, progressing from fundamentals to practice to a final project.` }], {
    temperature: 0.6,
    maxTokens: 8000,
    apiKey,
    model,
  })

  const draft = normalizeDraft(parseRoadmapJson(content), durationDays)

  // Long roadmaps can get truncated in one response — fill any missing days.
  if (durationDays && (draft.days?.length ?? 0) < durationDays) {
    draft.days = await fillMissingDays(draft, durationDays, { apiKey, model })
  }

  return draft
}

/** Generate day entries for a specific [start, end] range to extend a roadmap. */
async function generateDayRange(
  draft: RoadmapDraft,
  start: number,
  end: number,
  opts: { apiKey?: string; model?: string }
): Promise<DailyTaskItem[]> {
  const phases = draft.milestones.map((m, i) => `${i + 1}. ${m.title}`).join('\n')
  const prompt = `Continue an existing day-by-day learning plan.

Goal: ${draft.title}
Outcome: ${draft.description}
${draft.skillLevel ? `Skill level: ${draft.skillLevel}` : ''}
Phases/milestones:
${phases}

Produce ONLY days ${start} through ${end} (inclusive). Respond ONLY with valid JSON:
{
  "days": [
    { "day": ${start}, "week": ${Math.floor((start - 1) / 7) + 1}, "phase": "matching phase name", "title": "focused topic", "description": "1 sentence", "type": "lesson|practice|review|project" }
  ]
}
Cover every day in the range, in order, progressing logically from the earlier phases.`

  const content = await createChatCompletion([{ role: 'user', content: prompt }], {
    temperature: 0.5,
    maxTokens: 4000,
    apiKey: opts.apiKey,
    model: opts.model,
  })

  try {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return []
    const parsed = JSON.parse(match[0]) as { days?: DailyTaskItem[] }
    return Array.isArray(parsed.days) ? parsed.days.filter(d => d && typeof d.title === 'string') : []
  } catch {
    return []
  }
}

/** Iteratively top up a draft's days until it reaches the target duration. */
async function fillMissingDays(
  draft: RoadmapDraft,
  target: number,
  opts: { apiKey?: string; model?: string }
): Promise<DailyTaskItem[]> {
  const days = [...(draft.days ?? [])]
  let attempts = 0
  while (days.length < target && attempts < 4) {
    attempts++
    const start = days.length + 1
    const end = Math.min(start + 29, target)
    const range = await generateDayRange(draft, start, end, opts)
    const before = days.length
    for (const d of range) {
      const day = typeof d.day === 'number' && d.day > 0 ? d.day : days.length + 1
      if (day <= target && !days.some(x => x.day === day)) {
        days.push({
          day,
          week: typeof d.week === 'number' ? d.week : Math.floor((day - 1) / 7) + 1,
          phase: typeof d.phase === 'string' ? d.phase : undefined,
          title: d.title,
          description: typeof d.description === 'string' ? d.description : '',
          type: typeof d.type === 'string' ? d.type : 'lesson',
        })
      }
    }
    days.sort((a, b) => a.day - b.day)
    if (days.length === before) break // no progress — avoid an infinite loop
  }
  return days
}

/** Ensure days are sequential, well-formed, and consistent with the duration. */
function normalizeDraft(draft: RoadmapDraft, requestedDuration: number | null): RoadmapDraft {
  const days = Array.isArray(draft.days) ? draft.days : []
  const normalizedDays = days
    .filter(d => d && typeof d.title === 'string')
    .map((d, i) => ({
      day: typeof d.day === 'number' && d.day > 0 ? d.day : i + 1,
      week: typeof d.week === 'number' ? d.week : Math.floor(i / 7) + 1,
      phase: typeof d.phase === 'string' ? d.phase : undefined,
      title: d.title,
      description: typeof d.description === 'string' ? d.description : '',
      type: typeof d.type === 'string' ? d.type : 'lesson',
    }))
    .sort((a, b) => a.day - b.day)

  return {
    ...draft,
    durationDays: requestedDuration ?? clampDuration(draft.durationDays) ?? (normalizedDays.length || null),
    days: normalizedDays,
  }
}

export async function analyzeGoalAndGenerateMilestones(
  goalTitle: string,
  goalDescription: string,
  category: string,
  targetDate?: string,
  learningStyle?: string,
  options: { durationDays?: number | null; skillLevel?: string | null } = {}
): Promise<{ milestones: MilestoneItem[]; resources: ResourceItem[]; days: DailyTaskItem[]; advice: string }> {
  // Delegate to the day-by-day roadmap generator so the modal path produces the
  // same daily plan as the roadmap builder.
  const prompt = [
    `Goal: ${goalTitle}`,
    goalDescription ? `Details: ${goalDescription}` : '',
    `Category: ${category}`,
    targetDate ? `Target date: ${targetDate}` : '',
  ].filter(Boolean).join('\n')

  const draft = await generateRoadmapDraft(prompt, undefined, learningStyle, {
    durationDays: options.durationDays ?? null,
    skillLevel: options.skillLevel ?? null,
  })

  return {
    milestones: draft.milestones,
    resources: draft.resources,
    days: draft.days ?? [],
    advice: draft.advice,
  }
}

export interface DayLesson {
  summary: string
  sections: { heading: string; body: string }[]
  keyPoints: string[]
  practiceHint: string
}

/**
 * Synthesize a structured, readable lesson for a day, grounded in the scraped
 * snippets when available (falls back to model knowledge if scraping was thin).
 */
export async function generateDayLesson(
  topic: string,
  description: string,
  snippets: { source: string; text: string }[] = []
): Promise<DayLesson> {
  const grounding = snippets.length
    ? `Use these source excerpts as your primary grounding (cite ideas, do not copy verbatim):\n\n${snippets
        .map((s, i) => `[Source ${i + 1} — ${s.source}]\n${s.text}`)
        .join('\n\n')}`
    : 'No source excerpts were available; rely on your own knowledge and keep it accurate.'

  const prompt = `You are an expert instructor writing a single day's lesson.

Day topic: ${topic}
Focus: ${description}

${grounding}

CRITICAL: Teach ONLY "${topic}". Stay strictly on this specific subtopic — do NOT teach the broader goal or unrelated technologies. If any source excerpt is off-topic, ignore it entirely.

Respond ONLY with a valid JSON object in this exact format:
{
  "summary": "2-3 sentence overview of what the learner will understand by end of day",
  "sections": [
    { "heading": "section title", "body": "2-4 clear paragraphs teaching this part" }
  ],
  "keyPoints": ["concise takeaway", "..."],
  "practiceHint": "1-2 sentences suggesting how to practice this today"
}

Write 3-5 sections, all about "${topic}". Be concrete and practical. Plain text in bodies (no markdown headers).`

  const content = await createChatCompletion([{ role: 'user', content: prompt }], {
    temperature: 0.5,
    maxTokens: 2200,
  })

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse lesson response')
  const parsed = JSON.parse(jsonMatch[0]) as Partial<DayLesson>

  return {
    summary: parsed.summary || '',
    sections: Array.isArray(parsed.sections) ? parsed.sections.filter(s => s && s.heading && s.body) : [],
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.filter(Boolean) : [],
    practiceHint: parsed.practiceHint || '',
  }
}

export interface QuizQuestion {
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

/** Generate an MCQ quiz for a day, grounded in the provided content. */
export async function generateQuiz(
  topic: string,
  description: string,
  grounding: string,
  count = 5
): Promise<QuizQuestion[]> {
  const prompt = `You are a quiz writer. Create a ${count}-question multiple-choice quiz to test understanding of the day's material.

Day topic: ${topic}
Focus: ${description}

Material to base questions on:
${grounding || '(use accurate general knowledge of the topic)'}

Respond ONLY with a valid JSON object in this exact format:
{
  "questions": [
    {
      "question": "clear question text",
      "options": ["option A", "option B", "option C", "option D"],
      "answerIndex": 0,
      "explanation": "1 sentence on why the correct option is right"
    }
  ]
}

Rules: exactly 4 options per question; answerIndex is the 0-based index of the correct option; vary the correct position across questions; test real understanding, not trivia.`

  const content = await createChatCompletion([{ role: 'user', content: prompt }], {
    temperature: 0.4,
    maxTokens: 2200,
  })

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse quiz response')
  const parsed = JSON.parse(jsonMatch[0]) as { questions?: QuizQuestion[] }

  return (parsed.questions ?? [])
    .filter(q => q && q.question && Array.isArray(q.options) && q.options.length >= 2)
    .map(q => ({
      question: q.question,
      options: q.options.slice(0, 4),
      answerIndex: Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < q.options.length ? q.answerIndex : 0,
      explanation: q.explanation || '',
    }))
}

export interface PracticeTask {
  title: string
  language: string // javascript | typescript | python | java | cpp | go | ... | none
  instructions: string
  steps: string[]
  starterCode: string
  checklist: string[]
  hints: string[]
}

/** Generate a hands-on practice task for a day, grounded in the day's material. */
export async function generatePracticeTask(
  topic: string,
  description: string,
  category: string,
  grounding: string
): Promise<PracticeTask> {
  const prompt = `You are designing a single hands-on practice exercise so the learner applies today's material.

Day topic: ${topic}
Focus: ${description}
Goal category: ${category}

Material covered:
${grounding || '(use accurate general knowledge of the topic)'}

Respond ONLY with a valid JSON object in this exact format:
{
  "title": "short task title",
  "language": "primary language for the task — one of: javascript, typescript, python, java, cpp, c, go, rust, ruby, php, csharp, sql, or none if it isn't a coding task",
  "instructions": "2-4 sentences describing the task and the expected outcome",
  "steps": ["concrete step 1", "step 2", "step 3"],
  "starterCode": "runnable starter code the learner edits (include a main/entry point and a sample call so Run produces output). Empty string only if language is none.",
  "checklist": ["done when …", "…"],
  "hints": ["gentle nudge", "more specific hint", "near-solution hint"]
}

Make the task small enough to finish in one session, directly tied to today's topic, and runnable as-is (it should print something when run). Provide exactly 3 progressively more revealing hints.`

  const content = await createChatCompletion([{ role: 'user', content: prompt }], {
    temperature: 0.5,
    maxTokens: 2000,
  })

  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse practice task response')
  const p = JSON.parse(jsonMatch[0]) as Partial<PracticeTask>

  return {
    title: p.title || topic,
    language: (p.language || 'none').toLowerCase().trim(),
    instructions: p.instructions || '',
    steps: Array.isArray(p.steps) ? p.steps.filter(Boolean) : [],
    starterCode: typeof p.starterCode === 'string' ? p.starterCode : '',
    checklist: Array.isArray(p.checklist) ? p.checklist.filter(Boolean) : [],
    hints: Array.isArray(p.hints) ? p.hints.filter(Boolean) : [],
  }
}

export interface SubmissionResult {
  passed: boolean
  feedback: string
}

/** Evaluate a learner's code submission against the practice task. */
export async function evaluateSubmission(
  task: { title: string; instructions: string; checklist?: string[] },
  code: string,
  language: string,
  runOutput?: string
): Promise<SubmissionResult> {
  const prompt = `You are a strict-but-fair coding mentor grading a practice submission.

Task: ${task.title}
Instructions: ${task.instructions}
${task.checklist?.length ? `Done when:\n- ${task.checklist.join('\n- ')}` : ''}

Language: ${language}
Submitted code:
\`\`\`
${code.slice(0, 6000)}
\`\`\`
${runOutput ? `Program output when run:\n${runOutput.slice(0, 1500)}` : ''}

Decide if the submission genuinely satisfies the task. Respond ONLY with valid JSON:
{ "passed": true/false, "feedback": "2-3 sentences: what's good, and if failed, exactly what to fix (no full solution)" }`

  const content = await createChatCompletion([{ role: 'user', content: prompt }], {
    temperature: 0.2,
    maxTokens: 400,
  })

  try {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('no json')
    const parsed = JSON.parse(match[0]) as Partial<SubmissionResult>
    return { passed: Boolean(parsed.passed), feedback: parsed.feedback || 'Reviewed.' }
  } catch {
    return { passed: false, feedback: 'Could not evaluate the submission. Please try again.' }
  }
}

export async function getAdaptiveFeedback(
  goalTitle: string,
  completedMilestones: number,
  totalMilestones: number,
  pendingMilestone?: string
): Promise<string> {
  const progress = Math.round((completedMilestones / totalMilestones) * 100)
  const prompt = `You are an encouraging learning coach. Give brief, motivating feedback (2-3 sentences max).

Goal: ${goalTitle}
Progress: ${progress}% (${completedMilestones}/${totalMilestones} milestones done)
${pendingMilestone ? `Next up: ${pendingMilestone}` : 'All milestones completed!'}

Be specific, warm, and action-oriented. No fluff.`

  const content = await createChatCompletion([{ role: 'user', content: prompt }], {
    temperature: 0.8,
    maxTokens: 150,
  })

  return content || 'Keep going, you\'re making great progress!'
}

/**
 * Streams the mentor's reply as plain-text tokens (Server-Sent Events from Groq,
 * unwrapped into a clean text stream the browser can read incrementally).
 */
export async function streamChatWithMentor(
  messages: { role: 'user' | 'assistant'; content: string }[],
  goalContext?: string,
  options: { apiKey?: string; model?: string } = {}
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = options.apiKey || process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured')

  const systemPrompt = `You are Graa, the AI mentor inside Graa AI — a personalized learning assistant that helps users achieve their educational and professional goals. You provide specific, actionable advice, break down complex topics, and keep users motivated.${goalContext ? ` Current context: ${goalContext}` : ''} Be concise, warm, and practical.`

  const upstream = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 600,
      top_p: 0.95,
      stream: true,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    throw new Error(`Groq request failed (${upstream.status}) ${detail}`)
  }

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') {
          controller.close()
          return
        }
        try {
          const json = JSON.parse(data)
          const token = json.choices?.[0]?.delta?.content
          if (token) controller.enqueue(encoder.encode(token))
        } catch {
          // ignore keep-alive / partial JSON lines
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })
}

export async function chatWithMentor(
  messages: { role: 'user' | 'assistant'; content: string }[],
  goalContext?: string
): Promise<string> {
  const systemPrompt = `You are Graa, the AI mentor inside Graa AI — a personalized learning assistant that helps users achieve their educational and professional goals. You provide specific, actionable advice, break down complex topics, and keep users motivated.${goalContext ? ` Current context: ${goalContext}` : ''} Be concise, warm, and practical.`

  const content = await createChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    {
      temperature: 0.7,
      maxTokens: 500,
    }
  )

  return content || 'I\'m here to help! What would you like to know?'
}
