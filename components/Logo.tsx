// Custom brand mark: a "guiding star" (mentorship/north-star) on an aurora gradient.
export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="logoGlow" cx="0.3" cy="0.25" r="0.9">
          <stop stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#logoGrad)" />
      <rect width="48" height="48" rx="14" fill="url(#logoGlow)" />
      {/* main guiding star */}
      <path
        d="M24 7 C25.2 16.5 31.5 22.8 41 24 C31.5 25.2 25.2 31.5 24 41 C22.8 31.5 16.5 25.2 7 24 C16.5 22.8 22.8 16.5 24 7 Z"
        fill="white"
        fillOpacity="0.96"
      />
      {/* small accent spark */}
      <path
        d="M36 9 C36.4 11.6 38.4 13.6 41 14 C38.4 14.4 36.4 16.4 36 19 C35.6 16.4 33.6 14.4 31 14 C33.6 13.6 35.6 11.6 36 9 Z"
        fill="white"
        fillOpacity="0.85"
      />
    </svg>
  )
}

export default function Logo({
  size = 32,
  withWord = true,
  className = '',
}: {
  size?: number
  withWord?: boolean
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative inline-flex shadow-lg shadow-violet-500/30 rounded-[14px]">
        <LogoMark size={size} />
      </span>
      {withWord && (
        <span className="font-semibold tracking-tight text-[15px]">
          Goal<span className="gradient-text">Mentor</span>
        </span>
      )}
    </span>
  )
}
