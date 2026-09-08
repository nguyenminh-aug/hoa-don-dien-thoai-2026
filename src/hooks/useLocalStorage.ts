import { useEffect, useRef, useState, type SetStateAction } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? (JSON.parse(saved) as T) : initialValue
    } catch {
      return initialValue
    }
  })
  const valueRef = useRef(value)

  const persist = (nextValue: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(nextValue))
      window.dispatchEvent(new CustomEvent('hoa-don-storage-change'))
    } catch {
      // localStorage may be unavailable (e.g. private mode); ignore write failures
    }
  }

  // Persist synchronously as well as after rendering. This lets a newly opened
  // screen read a just-created invoice/customer immediately.
  const setStoredValue = (next: SetStateAction<T>) => {
    const resolved = typeof next === 'function'
      ? (next as (current: T) => T)(valueRef.current)
      : next
    valueRef.current = resolved
    persist(resolved)
    setValue(resolved)
  }

  useEffect(() => { valueRef.current = value; persist(value) }, [key, value])

  return [value, setStoredValue] as const
}
