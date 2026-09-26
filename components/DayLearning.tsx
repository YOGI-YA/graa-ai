'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Circle, Lock,
  PlayCircle, BookOpen, Lightbulb, ListChecks, Loader2, ExternalLink, Sparkles, RefreshCw,
} from 'lucide-react'
import QuizPanel from '@/components/QuizPanel'
import PracticeSandbox from '@/components/PracticeSandbox'
import { notify } from '@/components/Toast'
import { useTranslation } from '@/lib/LanguageContext'
import { INDIAN_LANGUAGES, getLanguage } from '@/lib/languages'

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
  global?: VideoContent | null
  localized?: VideoContent | null
  activeType?: 'global' | 'localized'
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
  const { t, language } = useTranslation()
  const [content, setContent] = useState<DayContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(task?.completed ?? false)
  const [quizPassed, setQuizPassed] = useState(initialQuizPassed)
  const [videoLanguage, setVideoLanguage] = useState<string>(
    language && language !== 'en' ? language : 'hi'
  )
  const [fetchingLanguageVideo, setFetchingLanguageVideo] = useState(false)
  const [refreshingVideo, setRefreshingVideo] = useState(false)
  const [selectedVideoType, setSelectedVideoType] = useState<'global' | 'localized'>(
    language && language !== 'en' ? 'localized' : 'global'
  )
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

  // Force-regenerate this day's content (fixes any stale/off-topic cached lesson).
  const regenerate = useCallback(async () => {
    setLoading(true)
    setError('')
    setContent(null)
    try {
      const res = await fetch(`/api/goals/${goalId}/day/${day}?refresh=1`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate')
      setContent(data.content)
      notify('Day content regenerated', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate')
      notify('Could not regenerate this day', 'error')
    } finally {
      setLoading(false)
    }
  }, [goalId, day])

  const handleFetchLanguageVideo = useCallback(async (targetLang: string) => {
    setVideoLanguage(targetLang)
    setSelectedVideoType('localized')
    setFetchingLanguageVideo(true)
    try {
      const res = await fetch(`/api/goals/${goalId}/day/${day}/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: targetLang, type: 'localized' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch video')
      setContent(prev => prev ? { ...prev, video: data.video } : null)
      const langInfo = getLanguage(targetLang)
      if (data.video?.localized) {
        notify(`Loaded verified ${langInfo.name} tutorial`, 'success')
      } else {
        notify(`No verified ${langInfo.name} video found, fallback applied`, 'info')
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not fetch language video', 'error')
    } finally {
      setFetchingLanguageVideo(false)
    }
  }, [goalId, day])

  const handleReverifyVideo = useCallback(async () => {
    setRefreshingVideo(true)
    try {
      const res = await fetch(`/api/goals/${goalId}/day/${day}/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: videoLanguage, type: 'both' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to re-verify video')
      setContent(prev => prev ? { ...prev, video: data.video } : null)
      if (data.video) {
        notify('Verified English and regional tutorials with AI', 'success')
      } else {
        notify('No verified tutorial video found for this specific subtopic', 'info')
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update video', 'error')
    } finally {
      setRefreshingVideo(false)
    }
  }, [goalId, day, videoLanguage])

  // Passing the quiz only UNLOCKS practice — the day completes when the practice
  // task is submitted and passes (the practice API marks it complete server-side),
  // so learners must actually do the task before moving on.
  const handleQuizPassed = useCallback(() => setQuizPassed(true), [])
  const handlePracticeSolved = useCallback(() => setCompleted(true), [])

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
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-white/35 truncate hidden sm:block">{goalTitle}</span>
            <button
              onClick={regenerate}
              disabled={loading}
              title="Regenerate this day's content"
              className="text-white/40 hover:text-orange-300 transition-colors flex items-center gap-1.5 text-xs flex-shrink-0 disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Regenerate
            </button>
          </div>
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
          <div className="inline-flex items-center gap-2 bg-orange-400/10 border border-orange-300/20 rounded-full px-3 py-1 text-xs text-orange-200 mb-4">
            <Sparkles size={13} />
            {t('dayLearning.day')} {day} of {totalDays}
            {task?.type && <span className="text-orange-200/50">· {task.type}</span>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">{task?.title || `${t('dayLearning.day')} ${day}`}</h1>
          {task?.description && <p className="text-white/55 text-sm sm:text-base leading-relaxed mt-3">{task.description}</p>}
        </div>

        {loading && <LoadingState />}

        {error && !loading && (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-red-300 text-sm mb-3">{error}</p>
            <button onClick={() => location.reload()} className="text-orange-300 text-sm hover:text-orange-200">Try again</button>
          </div>
        )}

        {!loading && !error && content && (
          <div className="space-y-6 fade-up">
            {/* Dual Video Player (Best English Masterclass vs Language-Specific Track) */}
            {(() => {
              const vidData = content.video
              const globalVid = vidData?.global || (vidData && (!vidData.localized || vidData.videoId === vidData.global?.videoId) ? vidData : null)
              const localizedVid = vidData?.localized || null
              const activeVideo = (selectedVideoType === 'localized' && localizedVid) ? localizedVid : (globalVid || localizedVid || vidData)
              const currentLangInfo = getLanguage(videoLanguage)

              if (!vidData && !globalVid && !localizedVid) {
                return (
                  <section className="glass rounded-2xl p-6 border border-white/10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                          <PlayCircle size={22} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white/90">Video Tutorials for this topic</div>
                          <div className="text-xs text-white/50 mt-0.5">Fetch the best authoritative English masterclass and native language tutorials.</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                          value={videoLanguage}
                          onChange={(e) => setVideoLanguage(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none"
                        >
                          {INDIAN_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                              {lang.nativeName} ({lang.name})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleReverifyVideo()}
                          disabled={refreshingVideo}
                          className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 flex-shrink-0"
                        >
                          <Sparkles size={13} />
                          {refreshingVideo ? 'Verifying with AI...' : 'Find Dual Videos'}
                        </button>
                      </div>
                    </div>
                  </section>
                )
              }

              return (
                <section className="glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                  {/* Top Bar with Dual Switcher & Language Picker */}
                  <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/[0.02]">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                        <PlayCircle size={16} className="text-red-400" />
                        <span>Curated Video Tutorials</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/20 font-normal">
                          Dual Track
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        High-accuracy English masterclass + dedicated {currentLangInfo.name} tutorial
                      </p>
                    </div>

                    {/* Switcher & Language Controls */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Track Switcher */}
                      <div className="inline-flex p-1 rounded-xl bg-black/40 border border-white/10">
                        <button
                          onClick={() => setSelectedVideoType('global')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                            selectedVideoType === 'global' || !localizedVid
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                              : 'text-white/50 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span>🌐</span>
                          <span>Best English Video</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedVideoType('localized')
                            if (!localizedVid) {
                              handleFetchLanguageVideo(videoLanguage)
                            }
                          }}
                          disabled={fetchingLanguageVideo}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                            selectedVideoType === 'localized' && localizedVid
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/20'
                              : 'text-white/50 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span>🗣️</span>
                          <span>{currentLangInfo.name} Video</span>
                          {!localizedVid && !fetchingLanguageVideo && (
                            <span className="text-[10px] text-cyan-300/70 font-normal">(Get)</span>
                          )}
                        </button>
                      </div>

                      {/* Language Picker Dropdown */}
                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5">
                        <span className="text-[11px] text-white/40">Language:</span>
                        <select
                          value={videoLanguage}
                          onChange={(e) => handleFetchLanguageVideo(e.target.value)}
                          disabled={fetchingLanguageVideo || refreshingVideo}
                          className="bg-transparent text-xs text-white/90 font-medium focus:outline-none cursor-pointer"
                        >
                          {INDIAN_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                              {lang.nativeName} ({lang.name})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* AI Re-verify Button */}
                      <button
                        onClick={() => handleReverifyVideo()}
                        disabled={refreshingVideo || fetchingLanguageVideo}
                        title="Re-verify or refresh videos with AI"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-orange-300 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={refreshingVideo || fetchingLanguageVideo ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Player Area */}
                  {fetchingLanguageVideo ? (
                    <div className="p-12 text-center bg-black/40 flex flex-col items-center justify-center gap-3">
                      <Loader2 size={28} className="animate-spin text-cyan-400" />
                      <div className="text-sm text-white/80 font-medium">
                        Searching and AI-verifying the top tutorial in {currentLangInfo.name} ({currentLangInfo.nativeName})...
                      </div>
                      <div className="text-xs text-white/40">Ensuring high pedagogical accuracy and zero off-topic clutter.</div>
                    </div>
                  ) : activeVideo?.videoId ? (
                    <div>
                      <div className="relative w-full bg-black/60" style={{ aspectRatio: '16 / 9' }}>
                        <iframe
                          key={activeVideo.videoId}
                          className="absolute inset-0 w-full h-full"
                          src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=0&rel=0`}
                          title={activeVideo.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <div className="px-5 py-3 text-xs bg-black/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${
                            selectedVideoType === 'localized' && localizedVid
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          }`}>
                            {selectedVideoType === 'localized' && localizedVid
                              ? `${currentLangInfo.name} Edition`
                              : 'Global English Masterclass'}
                          </span>
                          <span className="truncate text-white/70 font-medium">
                            {activeVideo.title}
                            {activeVideo.channel ? ` · ${activeVideo.channel}` : ''}
                          </span>
                        </div>
                        <a
                          href={activeVideo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white/45 hover:text-white flex items-center gap-1 flex-shrink-0 transition-colors"
                        >
                          Open in YouTube <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white/[0.01]">
                      <p className="text-sm text-white/60 mb-3">
                        No video found for {currentLangInfo.name} yet. Click below to fetch with AI:
                      </p>
                      <button
                        onClick={() => handleFetchLanguageVideo(videoLanguage)}
                        disabled={fetchingLanguageVideo}
                        className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                      >
                        <Sparkles size={13} />
                        Fetch {currentLangInfo.name} Video
                      </button>
                    </div>
                  )}
                </section>
              )
            })()}

            {/* Lesson */}
            {lesson && (
              <section className="glass rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <BookOpen size={16} className="text-emerald-300" />
                  {t('dayLearning.lessonSummary')}
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
                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-200 mb-2">
                      <ListChecks size={14} />
                      {t('dayLearning.keyConcepts')}
                    </div>
                    <ul className="space-y-1.5">
                      {lesson.keyPoints.map((k, i) => (
                        <li key={i} className="text-white/60 text-sm flex gap-2">
                          <span className="text-orange-400 flex-shrink-0">•</span>
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
                  <BookOpen size={16} className="text-orange-300" />
                  {t('dayLearning.documentation')}
                </div>
                <div className="space-y-2">
                  {content.docs.map((d, i) => (
                    <a
                      key={i}
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-white/8 hover:border-orange-300/40 hover:bg-white/[0.04] transition-all p-3"
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
              <PracticeSandbox goalId={goalId} day={day} onSolved={handlePracticeSolved} />
            ) : (
              <section className="glass rounded-2xl p-5 sm:p-6 opacity-60">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Sparkles size={16} className="text-orange-300" />
                  {t('dayLearning.practiceTask')}
                </div>
                <p className="text-white/40 text-sm">{t('dayLearning.quizRequired')}</p>
              </section>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className={`text-sm font-medium flex items-center gap-2 ${completed ? 'text-emerald-300' : 'text-white/40'}`}>
                {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                {completed ? t('dayLearning.dayCompleted') : 'Finish the practice to complete'}
              </span>

              <div className="flex items-center gap-2">
                {prevDay && (
                  <Link href={`/goals/${goalId}/day/${prevDay}`} className="btn-ghost px-3 py-2.5 text-sm flex items-center gap-1">
                    <ChevronLeft size={16} /> {t('dayLearning.day')} {prevDay}
                  </Link>
                )}
                {nextDay && (
                  completed ? (
                    <Link href={`/goals/${goalId}/day/${nextDay}`} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1">
                      {t('dayLearning.day')} {nextDay} <ChevronRight size={16} />
                    </Link>
                  ) : (
                    <span
                      title="Complete this day to unlock the next"
                      className="px-4 py-2.5 text-sm rounded-full bg-white/5 border border-white/10 text-white/35 flex items-center gap-1.5 cursor-not-allowed"
                    >
                      <Lock size={14} /> {t('dayLearning.day')} {nextDay}
                    </span>
                  )
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
