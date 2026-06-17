'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function GoogleButton({ label = 'Continue with Google' }: { label?: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      type="button"
      onClick={() => { setLoading(true); signIn('google', { callbackUrl: '/dashboard' }) }}
      disabled={loading}
      className="btn-ghost w-full py-3 flex items-center justify-center gap-2.5 text-sm"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.1 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.1 29 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 43.5c5.2 0 9.7-1.7 13.3-4.7l-6.1-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.1 5.2c-.4.4 6.6-4.8 6.6-14.6 0-1.2-.1-2.3-.3-3.5z" />
        </svg>
      )}
      {label}
    </button>
  )
}
