'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Circle,
  PlayCircle, BookOpen, Lightbulb, ListChecks, Loader2, ExternalLink, Sparkles,
} from 'lucide-react'
import QuizPanel from '@/components/QuizPanel'
import PracticeSandbox from '@/components/PracticeSandbox'

interface TaskInfo {
  day: number
  title: string
  description: string
  type: string
  completed: boolean
}

interface VideoContent {
  title: string
  url: string
  videoId: string
  thumbnail: string
  channel?: string
}

interface DocContent {
  title: string
  url: string
  source: string
  snippet?: string
}

interface LessonContent {
  summary: string
  sections: { heading: string; body: string }[]
  keyPoints: string[]
  practiceHint: string
}

interface DayContent {
  video?: VideoContent | null
  docs?: DocContent[]
  text?: LessonContent | null
}

export default function DayLearning({
  goalId,
  goalTitle,
  day,
  totalDays,
  task,
  initialQuizPassed = false,
  lastAttempt = null,
}: {
  goalId: string
  goalTitle: string
  day: number
  totalDays: number
  task: TaskInfo | null
  initialQuizPassed?: boolean
  lastAttempt?: { score: number; total: number; passed: boolean } | null
}) {
  const [content, setContent] = useState<DayContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(task?.completed ?? false)
  const [toggling, setToggling] = useState(false)
  const [quizPassed, setQuizPassed] = useState(initialQuizPassed)
  const practiceUnlocked = quizPassed || initialQuizPassed

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setContent(null)

    fetch(`/api/goals/${goalId}/day/${day}`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load day')
        setContent(data.content)
      })
      .catch(err => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Failed to load day')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [goalId, day])

  // Warm the next day's content once this one has loaded, so forward nav is instant.
  const prefetchedFor = useRef<number | null>(null)
  useEffect(() => {
    if (loading || error || day >= totalDays) return
    if (prefetchedFor.current === day) return
    prefetchedFor.current = day
    fetch(`/api/goals/${goalId}/day/${day + 1}`).catch(() => {})
  }, [loading, error, day, totalDays, goalId])

  const setComplete = useCallback(async (value: boolean) => {
    setToggling(true)
    setCompleted(value)
    try {
      const res = await fetch(`/api/goals/${goalId}/day/${day}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: value }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      setCompleted(!value)
    } finally {
      setToggling(false)
    }
  }, [day, goalId])

  const toggleComplete = useCallback(() => setComplete(!completed), [completed, setComplete])

  // Passing the quiz unlocks practice AND auto-completes the day.
  const handleQuizPassed = useCallback(() => {
    setQuizPassed(true)
    setComplete(true)
  }, [setComplete])

  const prevDay = day > 1 ? day - 1 : null
  const nextDay = day < totalDays ? day + 1 : null
  const lesson = content?.text

  return (
    <div className="min-h-screen text-white">
      <main className="relative max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <Link href={`/goals/${goalId}`} className="text-white/45 hover:text-white transition-colors flex items-center gap-2 text-sm">
            <ArrowLeft size={16} />
            Roadmap
          </Link>
          <div className="text-xs text-white/35 truncate max-w-[50%]">{goalTitle}</div>
        </div>

        {/* Course position */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-1 flex-1 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${Math.round((day / totalDays) * 100)}%` }} />
          </div>
          <span className="text-[11px] text-white/35 flex-shrink-0">{day}/{totalDays}</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-300/20 rounded-full px-3 py-1 text-xs text-cyan-100 mb-4">
            <Sparkles size={13} />
            Day {day} of {totalDays}
            {task?.type && <span className="text-cyan-200/50">· {task.type}</span>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">{task?.title || `Day ${day}`}</h1>
          {task?.description && <p className="text-white/55 text-sm sm:text-base leading-relaxed mt-3">{task.description}</p>}
        </div>

        {loading && <LoadingState />}

        {error && !loading && (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-red-300 text-sm mb-3">{error}</p>
            <button onClick={() => location.reload()} className="text-cyan-300 text-sm hover:text-cyan-200">Try again</button>
          </div>
        )}

        {!loading && !error && content && (
          <div className="space-y-6 fade-up">
            {/* Video */}
            {content.video && (
              <section className="glass rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 text-sm font-semibold px-5 pt-5 pb-3">
                  <PlayCircle size={16} className="text-red-400" />
                  Watch
                </div>
                <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${content.video.videoId}`}
                    title={content.video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="px-5 py-3 text-xs text-white/50">
                  {content.video.title}{content.video.channel ? ` · ${content.video.channel}` : ''}
                </div>
              </section>
            )}

            {/* Lesson */}
            {lesson && (
              <section className="glass rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <BookOpen size={16} className="text-emerald-300" />
                  Today&apos;s lesson
                </div>
                {lesson.summary && <p className="text-white/70 text-sm leading-relaxed mb-5">{lesson.summary}</p>}
                <div className="space-y-5">
                  {lesson.sections.map((s, i) => (
                    <div key={i}>
                      <h3 className="font-semibold text-sm sm:text-base text-white/90 mb-1.5">{s.heading}</h3>
                      <p className="text-white/55 text-sm leading-relaxed whitespace-pre-wrap">{s.body}</p>
                    </div>
                  ))}
                </div>

                {lesson.keyPoints.length > 0 && (
                  <div className="mt-6 bg-white/[0.03] border border-white/8 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200 mb-2">
                      <ListChecks size={14} />
                      Key takeaways
                    </div>
                    <ul className="space-y-1.5">
                      {lesson.keyPoints.map((k, i) => (
                        <li key={i} className="text-white/60 text-sm flex gap-2">
                          <span className="text-cyan-400 flex-shrink-0">•</span>
                          {k}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {lesson.practiceHint && (
                  <div className="mt-3 bg-amber-400/[0.06] border border-amber-300/15 rounded-xl p-4 flex gap-2.5">
                    <Lightbulb size={15} className="text-amber-300 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-100/80 text-sm leading-relaxed">{lesson.practiceHint}</p>
                  </div>
                )}
              </section>
            )}

            {/* Docs */}
            {content.docs && content.docs.length > 0 && (
              <section className="glass rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2 text-sm font-semibold mb-4">
                  <BookOpen size={16} className="text-indigo-300" />
                  Read &amp; explore
                </div>
                <div className="space-y-2">
                  {content.docs.map((d, i) => (
                    <a
                      key={i}
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-white/8 hover:border-cyan-300/40 hover:bg-white/[0.04] transition-all p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium truncate">{d.title}</span>
                        <ExternalLink size={13} className="text-white/30 flex-shrink-0" />
                      </div>
                      {d.snippet && <p className="text-white/40 text-xs leading-relaxed mt-1 line-clamp-2">{d.snippet}</p>}
                      <span className="text-[10px] uppercase tracking-wide text-white/25">{d.source}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Quiz */}
            <QuizPanel goalId={goalId} day={day} onPassed={handleQuizPassed} lastAttempt={lastAttempt} />

            {/* Practice — unlocks after passing the quiz */}
            {practiceUnlocked ? (
              <PracticeSandbox goalId={goalId} day={day} />
            ) : (
              <section className="glass rounded-2xl p-5 sm:p-6 opacity-60">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Sparkles size={16} className="text-cyan-300" />
                  Practice
                </div>
                <p className="text-white/40 text-sm">Pass the knowledge check above to unlock today&apos;s hands-on practice.</p>
              </section>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={toggleComplete}
                disabled={toggling}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${
                  completed
                    ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300'
                    : 'bg-white/8 text-white hover:bg-white/12 border border-white/10'
                }`}
              >
                {toggling ? <Loader2 size={16} className="animate-spin" /> : completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                {completed ? 'Completed' : 'Mark day complete'}
              </button>

              <div className="flex items-center gap-2">
                {prevDay && (
                  <Link href={`/goals/${goalId}/day/${prevDay}`} className="btn-ghost px-3 py-2.5 text-sm flex items-center gap-1">
                    <ChevronLeft size={16} /> Day {prevDay}
                  </Link>
                )}
                {nextDay && (
                  <Link href={`/goals/${goalId}/day/${nextDay}`} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1">
                    Day {nextDay} <ChevronRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <Loader2 size={28} className="animate-spin text-cyan-300 mx-auto mb-4" />
      <p className="text-sm font-medium">Curating today&apos;s lesson…</p>
      <p className="text-white/40 text-xs mt-1.5">Finding the best video, docs, and writing your lesson. This takes a few seconds the first time, then it&apos;s instant.</p>
    </div>
  )
}
