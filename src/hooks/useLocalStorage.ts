import { useEffect, useRef, useState, type SetStateAction } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const read = () => {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) as T : initialValue
  }
  const [value, setValue] = useState<T>(() => {
    try { return read() } catch { return initialValue }
  })
  const valueRef = useRef(value)

  const setStoredValue = (next: SetStateAction<T>) => {
    // Read the current storage, not an old screen's state. Never announce a
    // successful save when storage is full or unavailable.
    const current = read()
    const resolved = typeof next === 'function'
      ? (next as (current: T) => T)(current)
      : next
    localStorage.setItem(key, JSON.stringify(resolved))
    valueRef.current = resolved
    setValue(resolved)
    window.dispatchEvent(new CustomEvent('hoa-don-storage-change'))
    window.dispatchEvent(new Event('hoa-don-user-write'))
  }

  useEffect(() => {
    const refresh = () => {
      try {
        const next = read()
        valueRef.current = next
        setValue(next)
      } catch { /* Keep last known state; never overwrite unreadable data. */ }
    }
    refresh()
    window.addEventListener('hoa-don-storage-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('hoa-don-storage-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [key])

  return [value, setStoredValue] as const
}
