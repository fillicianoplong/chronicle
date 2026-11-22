import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { TYPING_PAUSE_MS, createTypingPause } from '../core/typingPause.ts'
import type { SubjectHit, TimelineSource } from '../data/TimelineSource.ts'

const NO_MATCH = 'No matching subject. Check the spelling or try another name.'

export function SubjectSearch({
  source,
  onPick,
}: {
  source: TimelineSource
  onPick: (subject: SubjectHit) => void
}) {
  const [text, setText] = useState('')
  const [hits, setHits] = useState<SubjectHit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [notice, setNotice] = useState('')
  const request = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const pause = useMemo(
    () =>
      createTypingPause(
        (ms) =>
          new Promise((resolve) => {
            setTimeout(resolve, ms)
          }),
        TYPING_PAUSE_MS,
      ),
    [],
  )

  async function runSearch(query: string, id: number): Promise<SubjectHit[]> {
    const trimmed = query.trim()
    if (trimmed === '') {
      setHits([])
      setOpen(false)
      setNotice('')
      return []
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const found = await source.searchSubjects(trimmed, controller.signal)
    if (id !== request.current) return []
    setHits(found)
    setActive(0)
    setOpen(found.length > 0)
    setNotice(found.length === 0 ? NO_MATCH : '')
    return found
  }

  function onText(value: string) {
    setText(value)
    setNotice('')
    setOpen(false)
    const id = ++request.current
    void pause.schedule(value).then((settled) => {
      if (settled === null || id !== request.current) return
      void runSearch(settled, id)
    })
  }

  function pick(subject: SubjectHit) {
    onPick(subject)
    setText(subject.label)
    setHits([])
    setOpen(false)
    setNotice('')
    setActive(0)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const chosen = open ? hits[active] : undefined
    if (chosen) {
      pick(chosen)
      return
    }
    pause.invalidate()
    const id = ++request.current
    const found = await runSearch(text, id)
    const top = found[0]
    if (id !== request.current || !top) return
    pick(top)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open || hits.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (index + 1) % hits.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (index - 1 + hits.length) % hits.length)
    }
  }

  const fuzzy = open && hits.some((hit) => hit.match === 'fuzzy')
  const status =
    notice ||
    (open
      ? `${String(hits.length)} ${hits.length === 1 ? 'suggestion' : 'suggestions'}`
      : '')
  const activeId = open ? optionId(hits[active]?.id) : undefined

  return (
    <form
      className="subject-search"
      role="search"
      onSubmit={(event) => {
        void onSubmit(event)
      }}
    >
      <label className="visually-hidden" htmlFor="subject">
        Subject
      </label>
      <div className="subject-search-field">
        <div className="subject-search-row">
          <SearchIcon />
          <input
            id="subject"
            name="subject"
            role="combobox"
            type="search"
            placeholder="Search a person, place, or topic"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? 'subject-suggestions' : undefined}
            aria-activedescendant={activeId}
            value={text}
            onChange={(event) => {
              onText(event.target.value)
            }}
            onKeyDown={onKeyDown}
          />
          <button type="submit">Search</button>
        </div>
        {open ? (
          <div className="suggestions">
            {fuzzy ? (
              <p className="suggestion-fallback">No exact match</p>
            ) : null}
            <ul
              id="subject-suggestions"
              role="listbox"
              aria-label="Suggestions"
            >
              {hits.map((hit, index) => (
                <li
                  key={hit.id}
                  id={optionId(hit.id)}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => {
                    setActive(index)
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    pick(hit)
                  }}
                >
                  <span className="suggestion-label">{hit.label}</span>
                  <span className="suggestion-description">
                    {hit.description}
                  </span>
                  <span className="suggestion-id">{hit.id}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <p className="subject-notice" role="status">
        {status}
      </p>
    </form>
  )
}

function optionId(id: string | undefined): string | undefined {
  if (!id) return undefined
  return `subject-option-${id}`
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="6.75"
        cy="6.75"
        r="4.4"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.2 10.2L14 14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  )
}
