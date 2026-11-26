// Crisp 18px monochrome stroke SVG icons for Aionyn. AGPL-3.0-only.
import type { ReactNode } from 'react'

interface IconProps {
  size?: number
  className?: string
}

function Svg({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function BrandMark({ size = 18, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
      <circle cx="12" cy="12" r="2.75" />
    </Svg>
  )
}

export function NavIcon({ name }: { name: string }) {
  switch (name) {
    case '/':
      return (
        <Svg>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h10" />
        </Svg>
      )
    case '/forums':
      return (
        <Svg>
          <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Svg>
      )
    case '/worlds':
      return (
        <Svg>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 9h16.8" />
          <path d="M3.6 15h16.8" />
          <path d="M12 3a13.5 13.5 0 0 0 0 18" />
          <path d="M12 3a13.5 13.5 0 0 1 0 18" />
        </Svg>
      )
    case '/spaces':
      return (
        <Svg>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </Svg>
      )
    case '/messages':
      return (
        <Svg>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </Svg>
      )
    case '/network':
      return (
        <Svg>
          <path d="M3 12h4l3-7 4 14 3-7h4" />
        </Svg>
      )
    case '/vault':
      return (
        <Svg>
          <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
          <circle cx="12" cy="11.5" r="1.75" />
        </Svg>
      )
    default:
      return null
  }
}

export function SunIcon() {
  return (
    <Svg size={15}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </Svg>
  )
}

export function MoonIcon() {
  return (
    <Svg size={15}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </Svg>
  )
}

export function VerifiedIcon() {
  return (
    <Svg size={13} className="verified-icon">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.25 2.25 4.75-5" />
    </Svg>
  )
}
