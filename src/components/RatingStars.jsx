import { useState } from 'react'

export function StarDisplay({ rating, max = 5, size = 'md' }) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-7 h-7' }
  const sz = sizes[size] || sizes.md
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(rating)
        const half   = !filled && i < rating
        return (
          <svg key={i} className={`${sz} transition-colors`} viewBox="0 0 24 24">
            {half ? (
              <defs>
                <linearGradient id={`half-${i}`} x1="0" x2="100%" y1="0" y2="0">
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="50%" stopColor="#374151" />
                </linearGradient>
              </defs>
            ) : null}
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={filled ? '#F59E0B' : half ? `url(#half-${i})` : '#374151'}
              stroke={filled || half ? '#F59E0B' : '#4B5563'}
              strokeWidth="1"
            />
          </svg>
        )
      })}
    </div>
  )
}

export default function RatingStars({ value, onChange, label, max = 5 }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div>
      {label && <p className="text-sm font-semibold text-gray-300 mb-2">{label}</p>}
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => {
          const star = i + 1
          const isActive = star <= (hovered || value)
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => onChange?.(star)}
              className="p-0.5 transition-transform hover:scale-125 focus:outline-none"
            >
              <svg className="w-7 h-7 transition-colors duration-150" viewBox="0 0 24 24">
                <polygon
                  points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                  fill={isActive ? '#F59E0B' : '#374151'}
                  stroke={isActive ? '#F59E0B' : '#4B5563'}
                  strokeWidth="1"
                />
              </svg>
            </button>
          )
        })}
        {value > 0 && (
          <span className="ml-2 text-sm font-bold text-amber-400">{value}/{max}</span>
        )}
      </div>
    </div>
  )
}
