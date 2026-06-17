// Wordmark-only logo — clean, professional, no icon.
export default function Logo({
  size = 30,
  className = '',
}: {
  size?: number
  withWord?: boolean
  className?: string
}) {
  return (
    <span
      className={`font-semibold tracking-tight text-white whitespace-nowrap ${className}`}
      style={{ fontSize: Math.round(size * 0.62) }}
    >
      Graa<span className="text-white/45 font-medium"> AI</span>
    </span>
  )
}
