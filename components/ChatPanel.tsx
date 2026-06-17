'use client'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X, Send, Brain, User } from 'lucide-react'
import type { Goal } from '@/types/goal'

interface Message { role: 'user' | 'assistant'; content: string }

const INITIAL_MESSAGES: Message[] = [
  { role: 'assistant', content: "Hi! I'm Graa, your AI mentor. I can help you strategize, break down challenges, or answer questions about your learning journey. What's on your mind?" },
]

const Bubble = memo(function Bubble({
  role,
  content,
  streaming,
}: {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}) {
  return (
    <div className={`msg-in flex gap-2 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        role === 'assistant' ? 'bg-indigo-500/20' : 'bg-white/10'
      }`}>
        {role === 'assistant' ? <Brain size={12} className="text-indigo-400" /> : <User size={12} className="text-white/60" />}
      </div>
      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
        role === 'user'
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-white/5 text-white/85 border border-white/5 rounded-tl-sm'
      } ${streaming ? 'stream-caret' : ''}`}>
        {content}
      </div>
    </div>
  )
})

function ChatPanel({ goals, onClose }: { goals: Goal[]; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [streaming, setStreaming] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<string>('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottom = useRef(true)

  const selectedGoalTitle = useMemo(() => (
    selectedGoal ? goals.find(goal => goal.id === selectedGoal)?.title ?? '' : ''
  ), [goals, selectedGoal])

  const allGoalTitles = useMemo(() => goals.map(goal => goal.title).join(', '), [goals])

  // Only auto-scroll when the user is already near the bottom, so we don't
  // yank the view away while they're reading earlier messages.
  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }, [])

  useLayoutEffect(() => {
    if (!stickToBottom.current) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const autoGrow = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]

    stickToBottom.current = true
    setMessages(nextMessages)
    setInput('')
    setStreaming('')
    setLoading(true)
    requestAnimationFrame(autoGrow)

    const goalContext = selectedGoalTitle || allGoalTitles

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
          goalContext: goalContext ? `User's goals: ${goalContext}` : undefined,
          goalId: selectedGoal || undefined,
        }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send message')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setStreaming(acc)
      }

      setMessages(prev => [...prev, { role: 'assistant', content: acc || "I'm here to help! What would you like to know?" }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'I had trouble responding just now. Please try again.' }])
    } finally {
      setStreaming(null)
      setLoading(false)
    }
  }, [allGoalTitles, autoGrow, input, loading, messages, selectedGoal, selectedGoalTitle])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 bg-black/65 flex items-end md:items-center justify-center md:justify-end p-0 md:p-6 z-50">
      <div className="glass-strong scale-in rounded-t-3xl md:rounded-3xl w-full md:w-[420px] flex flex-col" style={{ height: '85vh', maxHeight: '700px' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center">
              <Brain size={15} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Graa</p>
              <p className="text-xs text-white/40">Powered by Groq · LLaMA 3.3</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {goals.length > 0 && (
              <select
                value={selectedGoal}
                onChange={e => setSelectedGoal(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/60 focus:outline-none"
              >
                <option value="">All goals</option>
                {goals.map(g => <option key={g.id} value={g.id} className="bg-gray-900">{g.title.slice(0, 30)}</option>)}
              </select>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} onScroll={onScroll} className="chat-scroll flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <Bubble key={`${m.role}-${i}`} role={m.role} content={m.content} />
          ))}

          {streaming !== null && (
            streaming === ''
              ? (
                <div className="msg-in flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain size={12} className="text-indigo-400" />
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1 text-indigo-300">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )
              : <Bubble role="assistant" content={streaming} streaming />
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-2 py-1.5 focus-within:border-indigo-500/60 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); autoGrow() }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask your AI mentor..."
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-white text-xs placeholder-white/30 focus:outline-none leading-relaxed max-h-[120px]"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="btn-primary p-2.5 flex-shrink-0"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(ChatPanel)
