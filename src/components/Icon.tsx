type IconName =
  | 'document'
  | 'users'
  | 'box'
  | 'chart'
  | 'settings'
  | 'plus'
  | 'arrow'
  | 'search'
  | 'trash'
  | 'calendar'
  | 'chevron'
  | 'check'
  | 'close'

interface IconProps {
  name: IconName
  size?: number
}

export function Icon({ name, size = 24 }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  if (name === 'document') {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </svg>
    )
  }

  if (name === 'users') {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }

  if (name === 'box') {
    return <svg {...common}><path d="m21 8-9 5-9-5 9-5 9 5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></svg>
  }

  if (name === 'chart') {
    return (
      <svg {...common}>
        <path d="M3 3v18h18" />
        <path d="m7 16 4-5 3 2 5-7" />
      </svg>
    )
  }

  if (name === 'settings') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06A1.65 1.65 0 0 0 15.8 18a1.65 1.65 0 0 0-1 1.51v.09h-3v-.09A1.65 1.65 0 0 0 10.2 18a1.65 1.65 0 0 0-1.82.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 6.6 15a1.65 1.65 0 0 0-1.51-1H5v-3h.09A1.65 1.65 0 0 0 6.6 10a1.65 1.65 0 0 0-.33-1.82l-.06-.06L8.33 6l.06.06A1.65 1.65 0 0 0 10.2 6a1.65 1.65 0 0 0 1-1.51V4.4h3v.09A1.65 1.65 0 0 0 15.8 6a1.65 1.65 0 0 0 1.82-.33L17.67 5.6l2.12 2.12-.06.06A1.65 1.65 0 0 0 19.4 10a1.65 1.65 0 0 0 1.51 1H21v3h-.09A1.65 1.65 0 0 0 19.4 15Z" />
      </svg>
    )
  }

  if (name === 'plus') {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  }

  if (name === 'arrow') {
    return (
      <svg {...common}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    )
  }

  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    )
  }

  if (name === 'trash') {
    return (
      <svg {...common}>
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
    )
  }

  if (name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    )
  }

  if (name === 'chevron') {
    return (
      <svg {...common}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    )
  }

  if (name === 'check') {
    return (
      <svg {...common}>
        <path d="m5 12 5 5L20 6" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
