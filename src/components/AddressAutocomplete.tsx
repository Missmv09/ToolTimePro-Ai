'use client'

import { useEffect, useRef, useState } from 'react'
import {
  fetchAddressSuggestions,
  isAutocompleteEnabled,
  AddressSuggestion,
} from '@/lib/address-autocomplete'

interface Props {
  value: string
  onChange: (value: string) => void
  /** Called when a suggestion is picked — provides the full canonical address. */
  onSelect: (s: AddressSuggestion) => void
  placeholder?: string
  className?: string
  required?: boolean
  id?: string
}

/**
 * Street-address input with Mapbox autocomplete. When no Mapbox token is
 * configured it degrades to a plain text input (same behavior as before),
 * so it's always safe to use.
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  required,
  id,
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const enabled = isAutocompleteEnabled()
  const containerRef = useRef<HTMLDivElement>(null)
  // When the user picks a suggestion we suppress the next fetch (the value
  // change from selection shouldn't reopen the dropdown).
  const skipNextFetch = useRef(false)

  useEffect(() => {
    if (!enabled) return
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    if (value.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      const results = await fetchAddressSuggestions(value, { signal: controller.signal })
      setSuggestions(results)
      setOpen(results.length > 0)
      setActiveIndex(-1)
    }, 250)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [value, enabled])

  // Close the dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const pick = (s: AddressSuggestion) => {
    skipNextFetch.current = true
    onSelect(s)
    setOpen(false)
    setSuggestions([])
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      pick(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        className={className}
        placeholder={placeholder}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(s)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
