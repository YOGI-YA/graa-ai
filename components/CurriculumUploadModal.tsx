'use client'
import React, { useState, useRef, useCallback } from 'react'
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
} from 'lucide-react'
import { INDIAN_LANGUAGES } from '@/lib/languages'
import { useTranslation } from '@/lib/LanguageContext'
import type { Goal } from '@/types/goal'
import { notify } from '@/components/Toast'

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced']

export default function CurriculumUploadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (goal: Goal) => void
}) {
  const { t, language } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(language || 'en')
  const [skillLevel, setSkillLevel] = useState('')
  const [durationDays, setDurationDays] = useState('')

  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [extractedPreview, setExtractedPreview] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')

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

    setIsProcessing(true)
    setError('')
    setStatusMessage('Reading & parsing curriculum document...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('language', selectedLanguage)
      if (skillLevel) formData.append('skillLevel', skillLevel)
      if (durationDays) formData.append('durationDays', durationDays)

      setStatusMessage('Analyzing syllabus structure & generating day-by-day roadmap...')

      const res = await fetch('/api/curriculum/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process curriculum file')
      }

      if (data.text) {
        setExtractedPreview(data.text)
      }

      // Now save the generated roadmap into a Goal
      setStatusMessage('Finalizing and saving your customized roadmap...')
      const goalRes = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data.roadmap,
          language: selectedLanguage,
        }),
      })

      const goalData = await goalRes.json()
      if (!goalRes.ok) {
        throw new Error(goalData.error || 'Failed to create goal from curriculum')
      }

      notify('Curriculum roadmap generated successfully!', 'success')
      onCreated(goalData.goal)
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
                    Supports PDF, Word (.docx), TXT, Markdown, or scanned syllabus images
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Options Grid: Duration, Level & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Days Target */}
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium flex items-center gap-1.5">
                <Calendar size={13} className="text-orange-400" />
                Target Days
              </label>
              <input
                type="number"
                min={7}
                max={90}
                value={durationDays}
                onChange={e => setDurationDays(e.target.value)}
                placeholder="Auto-detect"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-orange-500 text-xs"
              />
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">Skill Level</label>
              <select
                value={skillLevel}
                onChange={e => setSkillLevel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500 text-xs capitalize"
              >
                <option value="" className="bg-gray-900">Auto-detect</option>
                {SKILL_LEVELS.map(l => (
                  <option key={l} value={l} className="bg-gray-900 capitalize">{l}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium flex items-center gap-1.5">
                <Globe size={13} className="text-orange-400" />
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500 text-xs"
              >
                {INDIAN_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} className="bg-gray-900">
                    {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Processing Status Banner */}
          {isProcessing && (
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-orange-400 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-orange-300">Processing Curriculum</p>
                <p className="text-white/60 text-[11px] mt-0.5">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="btn-ghost px-4 py-2.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isProcessing}
              className="btn-primary px-6 py-2.5 text-xs flex items-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate AI Roadmap
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
