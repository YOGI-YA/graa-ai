'use client'
import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Flame,
  Layers,
  LineChart,
  Loader2,
  PieChart,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import AppNav from '@/components/AppNav'

interface RadarMetric {
  subject: string
  score: number
  fullMark: number
}

interface SubjectBreakdown {
  category: string
  goalCount: number
  totalDays: number
  completedDays: number
  progressPct: number
  quizAccuracy: number
}

interface GoalSummary {
  id: string
  title: string
  category: string
  totalDays: number
  completedDays: number
  progressPct: number
  quizAccuracy: number
  masteryScore: number
  grade: string
  status: string
}

interface WeeklyActivity {
  week: string
  completedDays: number
}

interface PerformanceData {
  totalGoals: number
  activeGoals: number
  completedGoals: number
  totalDays: number
  completedDays: number
  overallProgressPct: number
  overallMasteryScore: number
  overallGrade: string
  avgQuizAccuracy: number
  totalQuizzesTaken: number
  firstAttemptRate: number
  streakDays: number
  longestStreak: number
  learningVelocity: number
  subjectBreakdown: SubjectBreakdown[]
  radarMetrics: RadarMetric[]
  goalSummaries: GoalSummary[]
  weeklyActivity: WeeklyActivity[]
}

// Radar Chart Component
function PerformanceRadar({ metrics }: { metrics: RadarMetric[] }) {
  const size = 300
  const center = size / 2
  const radius = 105
  const count = metrics.length || 5

  const angles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => (i * 2 * Math.PI) / count - Math.PI / 2)
  }, [count])

  const rings = [0.2, 0.4, 0.6, 0.8, 1.0]

  const scorePoints = useMemo(() => {
    return metrics
      .map((m, i) => {
        const factor = (m.score || 10) / 100
        const r = radius * factor
        const x = center + r * Math.cos(angles[i])
        const y = center + r * Math.sin(angles[i])
        return `${x},${y}`
      })
      .join(' ')
  }, [metrics, angles])

  return (
    <div className="relative flex flex-col items-center justify-center p-2">
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id="perfRadarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="perfPolyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        <circle cx={center} cy={center} r={radius + 15} fill="url(#perfRadarGlow)" />

        {rings.map((factor, idx) => {
          const ringPoints = angles
            .map(angle => {
              const x = center + radius * factor * Math.cos(angle)
              const y = center + radius * factor * Math.sin(angle)
              return `${x},${y}`
            })
            .join(' ')
          return (
            <polygon
              key={idx}
              points={ringPoints}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1.2"
              strokeDasharray={idx === rings.length - 1 ? 'none' : '3 3'}
            />
          )
        })}

        {angles.map((angle, idx) => (
          <line
            key={idx}
            x1={center}
            y1={center}
            x2={center + radius * Math.cos(angle)}
            y2={center + radius * Math.sin(angle)}
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1"
          />
        ))}

        <polygon
          points={scorePoints}
          fill="url(#perfPolyGrad)"
          stroke="#8b5cf6"
          strokeWidth="2.5"
          className="transition-all duration-700 ease-out"
        />

        {metrics.map((m, i) => {
          const factor = (m.score || 10) / 100
          const r = radius * factor
          const x = center + r * Math.cos(angles[i])
          const y = center + r * Math.sin(angles[i])
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="5"
              fill="#8b5cf6"
              stroke="#ffffff"
              strokeWidth="2"
            />
          )
        })}

        {metrics.map((m, i) => {
          const labelRadius = radius + 28
          const x = center + labelRadius * Math.cos(angles[i])
          const y = center + labelRadius * Math.sin(angles[i])
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.75)"
              fontSize="9.5"
              fontWeight="600"
            >
              {m.subject} ({m.score}%)
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// Activity Heatmap (weekly bar chart)
function WeeklyActivityChart({ data }: { data: WeeklyActivity[] }) {
  const maxVal = Math.max(...data.map(d => d.completedDays), 1)
  const barHeight = 120

  return (
    <div className="flex items-end gap-1.5 h-[140px] w-full px-2">
      {data.map((w, idx) => {
        const height = (w.completedDays / maxVal) * barHeight
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
            <span className="text-[10px] text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {w.completedDays}
            </span>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-violet-500/80 to-cyan-400/60 transition-all duration-500 group-hover:from-violet-400 group-hover:to-cyan-300"
              style={{ height: `${Math.max(height, 3)}px` }}
            />
            <span className="text-[9px] text-white/30">{w.week}</span>
          </div>
        )
      })}
    </div>
  )
}

// Category color mapping
function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    'Programming': 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
    'Data Science': 'text-violet-300 bg-violet-500/15 border-violet-500/30',
    'Design': 'text-pink-300 bg-pink-500/15 border-pink-500/30',
    'Language': 'text-amber-300 bg-amber-500/15 border-amber-500/30',
    'Business': 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
    'Mathematics': 'text-blue-300 bg-blue-500/15 border-blue-500/30',
    'Science': 'text-teal-300 bg-teal-500/15 border-teal-500/30',
    'Health': 'text-green-300 bg-green-500/15 border-green-500/30',
  }
  return map[cat] || 'text-orange-300 bg-orange-500/15 border-orange-500/30'
}

export default function OverallPerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'subjects' | 'goals'>('subjects')

  useEffect(() => {
    fetch('/api/performance')
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load performance data')
        setData(await res.json())
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen text-white">
        <AppNav />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-violet-400" size={32} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen text-white">
        <AppNav />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-red-300 text-sm">{error || 'No data available'}</p>
          <Link href="/dashboard" className="text-orange-300 hover:text-orange-200 text-sm mt-4 inline-block">← Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white pb-16">
      <AppNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-white/45 hover:text-white transition-colors flex items-center gap-2 text-sm mb-2"
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <TrendingUp size={18} className="text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Overall Performance Analytics</h1>
                <p className="text-xs sm:text-sm text-white/50">Cross-goal mastery metrics, learning velocity &amp; progress</p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="btn-ghost px-4 py-2 text-xs flex items-center gap-1.5"
          >
            <Layers size={14} /> All Goals
          </Link>
        </div>

        {/* Hero Scorecard */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
          {/* Grade Card */}
          <div className="lg:col-span-1 glass-strong rounded-3xl p-6 relative overflow-hidden border border-violet-500/25 flex flex-col justify-between">
            <div
              className="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)' }}
            />
            <div>
              <span className="eyebrow text-violet-400 flex items-center gap-1.5 mb-2">
                <Award size={13} /> Overall Grade
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-200 bg-clip-text text-transparent">
                  {data.overallGrade}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">{data.overallMasteryScore}/100 Mastery</p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                <span>Overall Progress</span>
                <span className="font-semibold text-white/90">{data.overallProgressPct}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-700"
                  style={{ width: `${data.overallProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quiz Accuracy */}
          <div className="glass rounded-3xl p-5 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 font-medium">Quiz Accuracy</span>
              <Brain size={18} className="text-cyan-400" />
            </div>
            <div className="my-2">
              <div className="text-3xl font-bold">{data.avgQuizAccuracy}%</div>
              <p className="text-xs text-white/40 mt-0.5">{data.totalQuizzesTaken} quizzes across all goals</p>
            </div>
            <div className="text-[11px] text-cyan-300/80 bg-cyan-500/10 rounded-lg p-2 border border-cyan-500/20">
              First-attempt pass: <span className="font-semibold">{data.firstAttemptRate}%</span>
            </div>
          </div>

          {/* Learning Streak */}
          <div className="glass rounded-3xl p-5 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 font-medium">Learning Streak</span>
              <Flame size={18} className="text-orange-400" />
            </div>
            <div className="my-2">
              <div className="text-3xl font-bold">{data.streakDays} <span className="text-lg text-white/50">days</span></div>
              <p className="text-xs text-white/40 mt-0.5">Current active streak</p>
            </div>
            <div className="text-[11px] text-orange-300/80 bg-orange-500/10 rounded-lg p-2 border border-orange-500/20">
              Longest streak: <span className="font-semibold">{data.longestStreak} days</span>
            </div>
          </div>

          {/* Days Completed */}
          <div className="glass rounded-3xl p-5 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 font-medium">Days Completed</span>
              <Zap size={18} className="text-amber-400" />
            </div>
            <div className="my-2">
              <div className="text-3xl font-bold">{data.completedDays} <span className="text-lg text-white/50">/ {data.totalDays}</span></div>
              <p className="text-xs text-white/40 mt-0.5">Total lessons across all goals</p>
            </div>
            <div className="text-[11px] text-amber-300/80 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">
              Velocity: <span className="font-semibold">{data.learningVelocity} days/goal avg</span>
            </div>
          </div>

          {/* Goals Summary */}
          <div className="glass rounded-3xl p-5 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 font-medium">Goals</span>
              <Target size={18} className="text-emerald-400" />
            </div>
            <div className="my-2">
              <div className="text-3xl font-bold">{data.totalGoals}</div>
              <p className="text-xs text-white/40 mt-0.5">{data.activeGoals} active · {data.completedGoals} completed</p>
            </div>
            <div className="text-[11px] text-emerald-300/80 bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20">
              {data.subjectBreakdown.length} subject{data.subjectBreakdown.length !== 1 ? 's' : ''} studied
            </div>
          </div>
        </div>

        {/* Visualization Row: Radar + Weekly Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Radar Chart */}
          <div className="lg:col-span-5 glass-strong rounded-3xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <PieChart size={16} className="text-violet-400" />
                  Cross-Goal Mastery Radar
                </h3>
                <p className="text-xs text-white/40">5-Dimensional Learning Profile</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">
                Aggregated
              </span>
            </div>
            <div className="flex items-center justify-center my-2">
              <PerformanceRadar metrics={data.radarMetrics} />
            </div>
          </div>

          {/* Weekly Activity */}
          <div className="lg:col-span-7 glass-strong rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <LineChart size={16} className="text-cyan-400" />
                  Weekly Learning Activity
                </h3>
                <p className="text-xs text-white/40">Lessons completed per week (last 12 weeks)</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                12-Week Trend
              </span>
            </div>
            <div className="mt-auto">
              <WeeklyActivityChart data={data.weeklyActivity} />
            </div>
          </div>
        </div>

        {/* Breakdown Tabs */}
        <div className="glass rounded-3xl p-6 border border-white/10">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('subjects')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'subjects'
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Subject-Wise Mastery
              </button>
              <button
                onClick={() => setActiveTab('goals')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'goals'
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Goal-by-Goal Breakdown
              </button>
            </div>
            <div className="text-xs text-white/40 hidden sm:block">
              {data.totalGoals} total goals
            </div>
          </div>

          {/* Subject-Wise Breakdown */}
          {activeTab === 'subjects' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.subjectBreakdown.map(s => {
                const colorClass = getCategoryColor(s.category)
                return (
                  <div
                    key={s.category}
                    className="rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 p-5 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
                        {s.category}
                      </span>
                      <span className="text-xs text-white/40">{s.goalCount} goal{s.goalCount !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-white/50 mb-1">
                          <span>Progress</span>
                          <span className="text-white/80 font-medium">{s.completedDays}/{s.totalDays} ({s.progressPct}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-400 rounded-full transition-all" style={{ width: `${s.progressPct}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-white/50 mb-1">
                          <span>Quiz Accuracy</span>
                          <span className="text-white/80 font-medium">{s.quizAccuracy}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${s.quizAccuracy}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {data.subjectBreakdown.length === 0 && (
                <div className="col-span-full text-center py-8 text-white/40 text-sm">
                  No subjects yet. Create a goal to start tracking performance.
                </div>
              )}
            </div>
          )}

          {/* Goal-by-Goal Table */}
          {activeTab === 'goals' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider">
                    <th className="py-3 px-3">Goal</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-center">Progress</th>
                    <th className="py-3 px-3 text-center">Quiz Accuracy</th>
                    <th className="py-3 px-3 text-center">Mastery</th>
                    <th className="py-3 px-3 text-center">Grade</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.goalSummaries.map(g => (
                    <tr key={g.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3 font-medium text-white/90 max-w-xs truncate">
                        {g.title}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getCategoryColor(g.category)}`}>
                          {g.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-medium text-white/80">{g.completedDays}/{g.totalDays}</span>
                        <span className="text-white/40 ml-1">({g.progressPct}%)</span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-mono font-medium ${
                          g.quizAccuracy >= 80 ? 'bg-emerald-500/15 text-emerald-300' :
                          g.quizAccuracy >= 60 ? 'bg-amber-500/15 text-amber-300' :
                          'bg-white/5 text-white/50'
                        }`}>
                          {g.quizAccuracy}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold font-mono text-violet-300">
                        {g.masteryScore}%
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                          g.grade.startsWith('A') ? 'bg-emerald-500/15 text-emerald-300' :
                          g.grade.startsWith('B') ? 'bg-cyan-500/15 text-cyan-300' :
                          g.grade.startsWith('C') ? 'bg-amber-500/15 text-amber-300' :
                          'bg-white/5 text-white/40'
                        }`}>
                          {g.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {g.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 size={13} /> Done
                          </span>
                        ) : g.status === 'ACTIVE' ? (
                          <span className="text-cyan-300">Active</span>
                        ) : (
                          <span className="text-white/40">{g.status}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Link
                          href={`/goals/${g.id}/evaluation`}
                          className="text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-1"
                        >
                          Details <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.goalSummaries.length === 0 && (
                <div className="text-center py-8 text-white/40 text-sm">
                  No goals yet. Create a goal to start tracking performance.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
