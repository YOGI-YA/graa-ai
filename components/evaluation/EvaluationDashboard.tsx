'use client'
import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Award,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  Flame,
  Layers,
  LineChart,
  PieChart,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import AppNav from '@/components/AppNav'

export interface RadarMetric {
  subject: string
  score: number
  fullMark: number
}

export interface ModuleMetric {
  id: string
  order: number
  title: string
  description: string
  status: string
  totalTasks: number
  completedTasks: number
  progressPct: number
  quizAverage: number
  moduleMarks: number
  masteryLevel: 'Mastered' | 'Proficient' | 'Developing' | 'Pending'
}

export interface DailyPoint {
  day: number
  week: number
  phase: string
  title: string
  completed: boolean
  type: string
  quizScore: number | null
  quizTotal: number | null
  quizPct: number | null
  quizPassed: boolean
  practiceMarks: number
  compositeScore: number
}

export interface EvaluationData {
  goal: {
    id: string
    title: string
    category: string
    description: string
    skillLevel?: string
    durationDays?: number
    language?: string
  }
  summary: {
    totalDays: number
    completedDays: number
    remainingDays: number
    overallProgressPct: number
    readinessScore: number
    grade: string
    avgQuizAccuracy: number
    quizzesAttempted: number
    firstAttemptPassRate: number
    practicePassRate: number
  }
  radarMetrics: RadarMetric[]
  modulePerformance: ModuleMetric[]
  dailyTimeline: DailyPoint[]
}

// Bespoke 5-Point SVG Radar Chart Component
function ExtremeRadarChart({ metrics }: { metrics: RadarMetric[] }) {
  const size = 320
  const center = size / 2
  const radius = 110
  const count = metrics.length || 5

  const angles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => (i * 2 * Math.PI) / count - Math.PI / 2)
  }, [count])

  // Concentric Web rings (20%, 40%, 60%, 80%, 100%)
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0]

  // Calculate polygon points for the user scores
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
  }, [metrics, angles, radius, center])

  return (
    <div className="relative flex flex-col items-center justify-center p-2">
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="polyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff7a00" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Outer Background Glow */}
        <circle cx={center} cy={center} r={radius + 15} fill="url(#radarGlow)" />

        {/* Web Rings */}
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

        {/* Radial Axis Lines */}
        {angles.map((angle, idx) => {
          const x2 = center + radius * Math.cos(angle)
          const y2 = center + radius * Math.sin(angle)
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
            />
          )
        })}

        {/* Filled Data Polygon */}
        <polygon
          points={scorePoints}
          fill="url(#polyGrad)"
          stroke="#ff9800"
          strokeWidth="2.5"
          className="transition-all duration-700 ease-out"
        />

        {/* Corner Metric Points */}
        {metrics.map((m, i) => {
          const factor = (m.score || 10) / 100
          const r = radius * factor
          const x = center + r * Math.cos(angles[i])
          const y = center + r * Math.sin(angles[i])
          return (
            <g key={i} className="group cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r="5.5"
                fill="#ff9800"
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-transform group-hover:scale-125"
              />
            </g>
          )
        })}

        {/* Subject Labels */}
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
              fontSize="10"
              fontWeight="600"
              className="tracking-tight select-none"
            >
              {m.subject} ({m.score}%)
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// Extreme Timeline & Daily Marks Curve (SVG Area Chart)
function ExtremeTimelineChart({ data }: { data: DailyPoint[] }) {
  const [hoveredPoint, setHoveredPoint] = useState<DailyPoint | null>(null)
  const width = 760
  const height = 220
  const padding = { top: 20, right: 30, bottom: 35, left: 40 }

  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const maxVal = 100
  const count = data.length || 1

  const points = useMemo(() => {
    return data.map((d, i) => {
      const x = padding.left + (count === 1 ? innerWidth / 2 : (i / (count - 1)) * innerWidth)
      const y = padding.top + innerHeight - (d.compositeScore / maxVal) * innerHeight
      return { x, y, data: d }
    })
  }, [data, count, innerWidth, innerHeight, padding.left, padding.top])

  const pathD = useMemo(() => {
    if (points.length === 0) return ''
    return points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
    }, '')
  }, [points])

  const areaD = useMemo(() => {
    if (points.length === 0) return ''
    const first = points[0]
    const last = points[points.length - 1]
    const baseline = padding.top + innerHeight
    return `${pathD} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
  }, [pathD, points, padding.top, innerHeight])

  return (
    <div className="w-full relative">
      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[620px] h-auto overflow-visible">
          <defs>
            <linearGradient id="timelineAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#ff7a00" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ff7a00" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(val => {
            const y = padding.top + innerHeight - (val / 100) * innerHeight
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.3)"
                  fontSize="9"
                >
                  {val}%
                </text>
              </g>
            )
          })}

          {/* Filled Area */}
          <path d={areaD} fill="url(#timelineAreaGrad)" />

          {/* Glowing Line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Nodes */}
          {points.map((p, idx) => (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(p.data)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.day === p.data.day ? '6.5' : '4'}
                fill={p.data.completed ? '#06b6d4' : '#374151'}
                stroke="#ffffff"
                strokeWidth={hoveredPoint?.day === p.data.day ? '2.5' : '1.5'}
                className="transition-all"
              />
              {/* Day numbers at bottom */}
              {idx % Math.ceil(data.length / 12) === 0 && (
                <text
                  x={p.x}
                  y={padding.top + innerHeight + 18}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.4)"
                  fontSize="10"
                >
                  D{p.data.day}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Interactive Tooltip Card */}
      {hoveredPoint && (
        <div className="absolute top-2 right-4 glass-strong p-3 rounded-xl border border-cyan-400/30 text-xs shadow-xl pointer-events-none animate-fadeIn">
          <div className="font-semibold text-cyan-300">
            Day {hoveredPoint.day}: {hoveredPoint.title}
          </div>
          <div className="text-white/60 text-[11px] mt-1 flex items-center gap-2">
            <span>Quiz: {hoveredPoint.quizPct !== null ? `${hoveredPoint.quizPct}%` : 'N/A'}</span>
            <span>•</span>
            <span>Task: {hoveredPoint.practiceMarks}%</span>
            <span>•</span>
            <span className="text-orange-300 font-medium">Overall: {hoveredPoint.compositeScore}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EvaluationDashboard({ data }: { data: EvaluationData }) {
  const { goal, summary, radarMetrics, modulePerformance, dailyTimeline } = data
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'ledger'>('overview')

  return (
    <div className="min-h-screen text-white pb-16">
      <AppNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href={`/goals/${goal.id}`}
              className="text-white/45 hover:text-white transition-colors flex items-center gap-2 text-sm mb-2"
            >
              <ArrowLeft size={16} /> Back to Roadmap
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                <BarChart3 size={18} className="text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Performance & Evaluation Analytics</h1>
                <p className="text-xs sm:text-sm text-white/50">{goal.title} · {goal.category}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/goals/${goal.id}`}
              className="btn-ghost px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <Layers size={14} /> Roadmap Graph
            </Link>
            <Link
              href={`/goals/${goal.id}/day/${Math.min(summary.completedDays + 1, summary.totalDays)}`}
              className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <Play size={14} /> Resume Learning
            </Link>
          </div>
        </div>

        {/* Hero Scorecard & Hologram Grade Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-8">
          {/* Hologram Grade Card */}
          <div className="glass-strong rounded-3xl p-6 relative overflow-hidden border border-orange-500/25 flex flex-col justify-between">
            <div
              className="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.3), transparent 70%)' }}
            />
            <div>
              <span className="eyebrow text-orange-400 flex items-center gap-1.5 mb-2">
                <Award size={13} /> Evaluation Score
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                  {summary.grade}
                </span>
                <span className="text-sm font-semibold text-white/60">
                  {summary.readinessScore}/100 Mastery
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                <span>Curriculum Readiness</span>
                <span className="font-semibold text-white/90">{summary.overallProgressPct}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-700"
                  style={{ width: `${summary.overallProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quiz Accuracy Metric */}
          <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 font-medium">Quiz Precision</span>
              <Brain size={18} className="text-cyan-400" />
            </div>
            <div className="my-2">
              <div className="text-3xl font-bold text-white">{summary.avgQuizAccuracy}%</div>
              <p className="text-xs text-white/40 mt-0.5">{summary.quizzesAttempted} quizzes taken</p>
            </div>
            <div className="text-[11px] text-cyan-300/80 bg-cyan-500/10 rounded-lg p-2 border border-cyan-500/20">
              First-attempt pass: <span className="font-semibold">{summary.firstAttemptPassRate}%</span>
            </div>
          </div>

          {/* Hands-on Task Execution */}
          <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 font-medium">Hands-on Tasks</span>
              <Zap size={18} className="text-amber-400" />
            </div>
            <div className="my-2">
              <div className="text-3xl font-bold text-white">{summary.completedDays} / {summary.totalDays}</div>
              <p className="text-xs text-white/40 mt-0.5">Lessons & challenges solved</p>
            </div>
            <div className="text-[11px] text-amber-300/80 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">
              Completion velocity: <span className="font-semibold">Active Pace</span>
            </div>
          </div>

          {/* Milestone Status */}
          <div className="glass rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 font-medium">Module Units</span>
              <Target size={18} className="text-emerald-400" />
            </div>
            <div className="my-2">
              <div className="text-3xl font-bold text-white">
                {modulePerformance.filter(m => m.masteryLevel === 'Mastered').length} / {modulePerformance.length}
              </div>
              <p className="text-xs text-white/40 mt-0.5">Units fully mastered</p>
            </div>
            <div className="text-[11px] text-emerald-300/80 bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20">
              {summary.remainingDays} days remaining
            </div>
          </div>
        </div>

        {/* Extreme Visualization Section: Radar & Timeline Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Radar Chart (5 Columns) */}
          <div className="lg:col-span-5 glass-strong rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <PieChart size={16} className="text-cyan-400" />
                  Cognitive Mastery Radar
                </h3>
                <p className="text-xs text-white/40">5-Dimensional Competency Matrix</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                Live Analysis
              </span>
            </div>
            <div className="flex items-center justify-center my-2">
              <ExtremeRadarChart metrics={radarMetrics} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-white/5">
              <div className="text-white/50">Strongest Domain: <span className="text-cyan-300 font-medium">Conceptual Retention</span></div>
              <div className="text-white/50 text-right">Target Focus: <span className="text-orange-300 font-medium">Hands-on Execution</span></div>
            </div>
          </div>

          {/* Timeline & Marks Graph (7 Columns) */}
          <div className="lg:col-span-7 glass-strong rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <LineChart size={16} className="text-orange-400" />
                  Performance Trajectory Curve
                </h3>
                <p className="text-xs text-white/40">Daily Quiz Scores, Practice Marks & Trajectory</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/20">
                Score Timeline
              </span>
            </div>

            <div className="my-auto py-2">
              <ExtremeTimelineChart data={dailyTimeline} />
            </div>

            <div className="flex items-center justify-between text-xs text-white/40 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Quiz Score</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> Practice Marks</span>
              </div>
              <span>Higher curve = Greater mastery</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Tabs */}
        <div className="glass rounded-3xl p-6 border border-white/10">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'overview'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Module-by-Module Breakdown
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeTab === 'ledger'
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Daily Task Marks Ledger
              </button>
            </div>
            <div className="text-xs text-white/40 hidden sm:block">
              {dailyTimeline.length} total curriculum days
            </div>
          </div>

          {/* Module-by-Module Matrix View */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {modulePerformance.map(m => (
                <div
                  key={m.id}
                  className="rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 p-4 sm:p-5 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 font-mono">
                          Unit {m.order}
                        </span>
                        <h4 className="font-semibold text-sm sm:text-base text-white/90">{m.title}</h4>
                      </div>
                      <p className="text-xs text-white/45 mt-1">{m.description}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        m.masteryLevel === 'Mastered'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : m.masteryLevel === 'Proficient'
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          : m.masteryLevel === 'Developing'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-white/5 text-white/40 border-white/10'
                      }`}>
                        {m.masteryLevel}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/5 text-xs">
                    <div>
                      <div className="flex justify-between text-white/50 mb-1">
                        <span>Tasks Completed</span>
                        <span className="text-white/80 font-medium">{m.completedTasks} / {m.totalTasks} ({m.progressPct}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${m.progressPct}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-white/50 mb-1">
                        <span>Quiz Accuracy</span>
                        <span className="text-white/80 font-medium">{m.quizAverage}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${m.quizAverage}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-white/50 mb-1">
                        <span>Module Marks</span>
                        <span className="text-white/80 font-medium">{m.moduleMarks} / 100</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full" style={{ width: `${m.moduleMarks}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Daily Marks Ledger View */}
          {activeTab === 'ledger' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider">
                    <th className="py-3 px-3">Day</th>
                    <th className="py-3 px-4">Topic / Focus</th>
                    <th className="py-3 px-3">Phase</th>
                    <th className="py-3 px-3 text-center">Quiz Score</th>
                    <th className="py-3 px-3 text-center">Practice Marks</th>
                    <th className="py-3 px-3 text-center">Composite</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dailyTimeline.map(d => (
                    <tr key={d.day} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3 font-mono text-cyan-300 font-semibold">
                        Day {d.day}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white/90 max-w-xs truncate">
                        {d.title}
                      </td>
                      <td className="py-3.5 px-3 text-white/50 truncate max-w-[140px]">
                        {d.phase}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {d.quizScore !== null && d.quizTotal !== null ? (
                          <span className={`px-2 py-0.5 rounded font-mono font-medium ${
                            d.quizPassed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                          }`}>
                            {d.quizScore}/{d.quizTotal} ({d.quizPct}%)
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-mono font-medium ${
                          d.completed ? 'bg-cyan-500/15 text-cyan-300' : 'bg-white/5 text-white/40'
                        }`}>
                          {d.practiceMarks} / 100
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold font-mono text-orange-300">
                        {d.compositeScore}%
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {d.completed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 size={13} /> Done
                          </span>
                        ) : (
                          <span className="text-white/40">Incomplete</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Link
                          href={`/goals/${goal.id}/day/${d.day}`}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                        >
                          View <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
