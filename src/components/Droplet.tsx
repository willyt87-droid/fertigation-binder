import { useId } from 'react'

type DropletProps = {
  size?: number
}

export function Droplet({ size = 28 }: DropletProps) {
  const fillId = `drop${useId().replace(/:/g, '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={fillId} x1="18" y1="8" x2="50" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${fillId})`}
        d="M32 6c0 0-16 20.5-16 32.5a16 16 0 1 0 32 0C48 26.5 32 6 32 6z"
      />
      <path
        fill="#ecfeff"
        opacity="0.38"
        d="M24.5 28c2.4-4 5.6-8.6 7.5-11.6-9.2 12.4-11.6 20-11.6 25.2 0 2.2.4 4.2 1.2 6.1C19.4 43 20.2 34.8 24.5 28z"
      />
    </svg>
  )
}
