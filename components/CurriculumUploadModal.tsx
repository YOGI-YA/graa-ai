'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  UploadCloud,
  FileText,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Sparkles,
  Globe,
  Calendar,
  AlertCircle,
  Eye,
  ArrowRight,
  BookOpen,
  Brain,
  Cpu,
  Clock,
  Layers,
  Terminal,
  Compass,
  Lightbulb,
} from 'lucide-react'
import { INDIAN_LANGUAGES } from '@/lib/languages'
import { useTranslation } from '@/lib/LanguageContext'
import type { Goal } from '@/types/goal'
import { notify } from '@/components/Toast'
import { extractTextFromCurriculumClient } from '@/lib/clientCurriculumParser'

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced']

const STUDY_TIPS = [
  'Graa AI breaks dense chapters into 20–30 minute daily micro-lessons for maximum retention.',
  'Every single day in your roadmap includes an active recall quiz and hands-on practice lab.',
  'Foundational topics are sequenced first so advanced units build on intuitive mental models.',
  'You can customize study duration, video language, or practice mode anytime in your dashboard.',
  'Active recall and spaced repetition improve long-term syllabus retention by over 70%.',
]

interface LogItem {
  id: number
  time: string
  text: string
  active?: boolean
}

export default function CurriculumUploadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (goal: Goal) => void
}) {
  const router = useRouter()
  const { t, language } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(language || 'en')
  const [skillLevel, setSkillLevel] = useState('')
  const [durationDays, setDurationDays] = useState('')

  useEffect(() => {
    if (language) {
      setSelectedLanguage(language)
    }
  }, [language])

  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [statusMessage, setStatusMessage] = useState('')
  const [extractedPreview, setExtractedPreview] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')

  // Live timer & telemetry logs for "Behind the Scenes" engagement
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [activeTipIndex, setActiveTipIndex] = useState(0)
  const [logs, setLogs] = useState<LogItem[]>([])

  // Timer interval while generating
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isProcessing) {
      setElapsedSeconds(0)
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isProcessing])

  // Tip rotation interval while generating
  useEffect(() => {
    let tipTimer: NodeJS.Timeout
    if (isProcessing) {
      tipTimer = setInterval(() => {
        setActiveTipIndex(prev => (prev + 1) % STUDY_TIPS.length)
      }, 4000)
    }
    return () => clearInterval(tipTimer)
  }, [isProcessing])

  const addLog = useCallback((text: string) => {
    const time = `${(elapsedSeconds || 0).toString().padStart(2, '0')}s`
    setLogs(prev => [...prev.slice(-6), { id: Date.now() + Math.random(), time, text }])
  }, [elapsedSeconds])

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      setFile(droppedFile)
      setError('')
      setExtractedPreview('')
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setError('')
      setExtractedPreview('')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || isProcessing) return

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit. Please upload a smaller document or syllabus.')
      return
    }

    setIsProcessing(true)
    setError('')
    setCurrentStep(1)
    setStatusMessage('Reading & extracting curriculum structure...')
    setLogs([
      { id: 1, time: '00s', text: `Mounted file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)` },
      { id: 2, time: '01s', text: 'Initializing high-speed client PDF extraction engine...' },
    ])

    try {
      // 1. High-speed client-side extraction directly in the browser
      let clientExtractedText = ''
      try {
        clientExtractedText = await extractTextFromCurriculumClient(file, (msg) => {
          setStatusMessage(msg)
          addLog(msg)
          if (msg.includes('Table of Contents') || msg.includes('outline')) {
            setCurrentStep(2)
          }
        })
      } catch (err: any) {
        console.warn('Client-side extraction fallback:', err)
        if (err?.message && !err.message.includes('fallback')) {
          throw new Error(err.message)
        }
      }

      setCurrentStep(3)
      setStatusMessage('Synthesizing day-by-day learning progression...')
      addLog('Transmitting extracted course outline to inference cluster...')
      addLog('Mapping topics to progressive difficulty & daily milestones...')

      // Simulate step progression for engagement
      setTimeout(() => {
        setCurrentStep(4)
        addLog('Curating focused practice challenges and video tutorials...')
      }, 2500)

      let res: Response
      if (clientExtractedText && clientExtractedText.length > 20) {
        res = await fetch('/api/curriculum/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: clientExtractedText,
            fileName: file.name,
            language: selectedLanguage,
            skillLevel: skillLevel || undefined,
            durationDays: durationDays ? parseInt(durationDays, 10) : undefined,
          }),
        })
      } else {
        // Fallback for image scans / binary formats: send formData
        if (file.size > 4.5 * 1024 * 1024) {
          throw new Error('This scanned document exceeds the 4.5MB cloud upload limit. Please upload a digital PDF, Word doc, or text syllabus.')
        }
        const formData = new FormData()
        formData.append('file', file)
        formData.append('language', selectedLanguage)
        if (skillLevel) formData.append('skillLevel', skillLevel)
        if (durationDays) formData.append('durationDays', durationDays)

        res = await fetch('/api/curriculum/parse', {
          method: 'POST',
          body: formData,
        })
      }

      if (res.status === 413) {
        throw new Error('Document payload is too large for cloud upload. Please try a text or standard digital PDF file.')
      }

      let data: any
      try {
        data = await res.json()
      } catch {
        throw new Error(`Server returned status ${res.status}: Failed to process curriculum`)
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process curriculum file')
      }

      if (data.text) {
        setExtractedPreview(data.text)
      }

      // If goal was atomically created by the API, use it immediately
      if (data.goal) {
        addLog('Roadmap assembled and saved to your dashboard!')
        notify('Curriculum roadmap generated successfully!', 'success')
        onCreated(data.goal)
        router.push(`/goals/${data.goal.id}`)
        return
      }

      // Fallback: save roadmap to goal
      setStatusMessage('Finalizing and saving your customized roadmap...')
      const goalRes = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data.roadmap,
          language: selectedLanguage,
        }),
      })

      let goalData: any
      try {
        goalData = await goalRes.json()
      } catch {
        throw new Error('Failed to save generated roadmap')
      }

      if (!goalRes.ok) {
        throw new Error(goalData.error || 'Failed to create goal from curriculum')
      }

      notify('Curriculum roadmap generated successfully!', 'success')
      onCreated(goalData.goal)
      router.push(`/goals/${goalData.goal.id}`)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext === 'pdf') return <FileText className="text-red-400" size={24} />
    if (ext === 'docx' || ext === 'doc') return <FileText className="text-blue-400" size={24} />
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return <ImageIcon className="text-emerald-400" size={24} />
    return <FileCode className="text-amber-400" size={24} />
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="glass-strong rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500/15 border border-orange-500/25 rounded-xl flex items-center justify-center">
              <UploadCloud size={18} className="text-orange-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-white">Upload Curriculum / Syllabus</h2>
              <p className="text-white/40 text-xs">AI reads your whole curriculum & builds a tailored roadmap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/40 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* ======================================================== */}
        {/* LIVE "BEHIND THE SCENES" SYNTHESIS ENGINE (When Generating) */}
        {/* ======================================================== */}
        {isProcessing ? (
          <div className="p-7 space-y-6 animate-fadeIn">
            {/* Pulsing Status Header */}
            <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 animate-pulse">
                    <Brain size={20} />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Generating AI Roadmap</h3>
                  <p className="text-xs text-orange-300/80 truncate max-w-xs">{statusMessage || 'Analyzing course structure...'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/70">
                <Clock size={13} className="text-orange-400" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>

            {/* Stepper Pipeline */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Synthesis Pipeline</p>

              {/* Step 1 */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                currentStep >= 1 ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-white/[0.02] border-white/5 text-white/40'
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  currentStep > 1 ? 'bg-emerald-500 text-black' : currentStep === 1 ? 'bg-orange-500/30 text-orange-300' : 'bg-white/10 text-white/40'
                }`}>
                  {currentStep > 1 ? <CheckCircle2 size={15} /> : '1'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">Document Ingestion & TOC Extraction</p>
                  <p className="text-[11px] text-white/40 truncate">
                    {file?.name} ({(file ? file.size / (1024 * 1024) : 0).toFixed(2)} MB) · Table of Contents identified
                  </p>
                </div>
                {currentStep === 1 && <Loader2 size={15} className="animate-spin text-orange-400" />}
              </div>

              {/* Step 2 */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                currentStep >= 2 ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-white/[0.02] border-white/5 text-white/40'
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  currentStep > 2 ? 'bg-emerald-500 text-black' : currentStep === 2 ? 'bg-orange-500/30 text-orange-300' : 'bg-white/10 text-white/40'
                }`}>
                  {currentStep > 2 ? <CheckCircle2 size={15} /> : '2'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">Curriculum Architecture & Prerequisites</p>
                  <p className="text-[11px] text-white/40">Detecting core units, chapters, and foundational topics</p>
                </div>
                {currentStep === 2 && <Loader2 size={15} className="animate-spin text-orange-400" />}
              </div>

              {/* Step 3 */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                currentStep >= 3 ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-white/[0.02] border-white/5 text-white/40'
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  currentStep > 3 ? 'bg-emerald-500 text-black' : currentStep === 3 ? 'bg-orange-500/30 text-orange-300' : 'bg-white/10 text-white/40'
                }`}>
                  {currentStep > 3 ? <CheckCircle2 size={15} /> : '3'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">Pedagogical Day-by-Day Sequencing</p>
                  <p className="text-[11px] text-white/40">Structuring progression from core fundamentals to mastery</p>
                </div>
                {currentStep === 3 && <Loader2 size={15} className="animate-spin text-orange-400" />}
              </div>

              {/* Step 4 */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                currentStep >= 4 ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-white/[0.02] border-white/5 text-white/40'
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  currentStep > 4 ? 'bg-emerald-500 text-black' : currentStep === 4 ? 'bg-orange-500/30 text-orange-300' : 'bg-white/10 text-white/40'
                }`}>
                  {currentStep > 4 ? <CheckCircle2 size={15} /> : '4'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">Milestone Gates & Active Recall Practice</p>
                  <p className="text-[11px] text-white/40">Linking video tutorials, quizzes, and personal coaching strategy</p>
                </div>
                {currentStep === 4 && <Loader2 size={15} className="animate-spin text-orange-400" />}
              </div>
            </div>

            {/* Live Terminal Telemetry Feed */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono text-white/40 flex items-center gap-1.5">
                  <Terminal size={12} className="text-orange-400" />
                  Live Engine Telemetry
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Streaming
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-white/70 space-y-1.5 max-h-32 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-[11px]">
                    <span className="text-orange-400/80 font-semibold">[{log.time}]</span>
                    <span className="text-white/80">{log.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Study Tip */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 flex items-start gap-3">
              <Lightbulb size={17} className="text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-orange-300/90 mb-0.5">Study Science Insight</p>
                <p className="text-xs text-white/70 leading-relaxed transition-all duration-300">{STUDY_TIPS[activeTipIndex]}</p>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* STANDARD UPLOAD FORM (When Idle) */
          /* ======================================================== */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5">
                <AlertCircle size={15} className="flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Drag & Drop File Zone */}
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Curriculum Document / Syllabus File</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-orange-400 bg-orange-500/10'
                    : file
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-white/10 hover:border-white/25 hover:bg-white/[0.02]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,.rtf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex items-center justify-center gap-3 py-2">
                    {getFileIcon(file.name)}
                    <div className="text-left min-w-0">
                      <p className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</p>
                      <p className="text-xs text-white/40">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready for AI analysis
                      </p>
                    </div>
                    <CheckCircle2 size={20} className="text-emerald-400 ml-auto" />
                  </div>
                ) : (
                  <div className="py-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-orange-400">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-sm font-medium text-white/80">Click or drag & drop curriculum here</p>
                    <p className="text-xs text-white/40 mt-1">
                      Supports PDF textbooks & syllabi (up to 50MB), Word (.docx), TXT, or Markdown
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Options Grid: Duration, Level & Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-orange-400" />
                  Target Days
                </label>
                <input
                  type="number"
                  min="7"
                  max="90"
                  placeholder="Auto-detect"
                  value={durationDays}
                  onChange={e => setDurationDays(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">Skill Level</label>
                <select
                  value={skillLevel}
                  onChange={e => setSkillLevel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="" className="bg-[#121217]">Auto-Detect</option>
                  {SKILL_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl} className="bg-[#121217]">
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1 flex items-center gap-1">
                  <Globe size={12} className="text-orange-400" />
                  Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={e => setSelectedLanguage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  {INDIAN_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code} className="bg-[#121217]">
                      {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Extracted Preview Collapsible */}
            {extractedPreview && (
              <div className="border border-white/10 rounded-xl p-3 bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1.5 font-medium"
                >
                  <Eye size={13} />
                  {showPreview ? 'Hide Extracted Syllabus Preview' : 'View Extracted Syllabus Preview'}
                </button>
                {showPreview && (
                  <pre className="mt-2.5 p-3 rounded-lg bg-black/40 text-[11px] text-white/60 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
                    {extractedPreview}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles size={14} />
                Generate AI Roadmap
                <ArrowRight size={13} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
