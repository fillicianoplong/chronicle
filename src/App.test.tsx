import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App.tsx'
import type { SubjectHit, TimelineSource } from './data/TimelineSource.ts'

const marie: SubjectHit = {
  id: 'Q7186' as SubjectHit['id'],
  label: 'Marie Curie',
  description: 'Polish-born French physicist and chemist (1867–1934)',
}

function sourceFor(textToHits: (text: string) => SubjectHit[]): {
  source: TimelineSource
  fetchBatch: ReturnType<typeof vi.fn>
} {
  const fetchBatch = vi.fn(() =>
    Promise.resolve({
      ok: false as const,
      error: { kind: 'badShape' as const, detail: 'not used' },
    }),
  )
  return {
    fetchBatch,
    source: {
      searchSubjects: (text) => Promise.resolve(textToHits(text)),
      searchProperties: () => Promise.resolve([]),
      fetchBatch,
      fetchLabels: () => Promise.resolve(new Map()),
    },
  }
}

function renderApp(source: TimelineSource = sourceFor(() => []).source) {
  return render(
    <StrictMode>
      <App source={source} />
    </StrictMode>,
  )
}

describe('App', () => {
  it('renders the Chronicle shell', () => {
    renderApp()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Chronicle' }),
    ).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Subject' })).toHaveAttribute(
      'placeholder',
      'Search a person, place, or topic',
    )
    expect(screen.getByRole('button', { name: 'Search' })).toBeVisible()
    expect(
      screen.getByRole('heading', { level: 2, name: 'No subject yet' }),
    ).toBeVisible()
    expect(
      screen.getByText('Search for a Wikidata subject to see its timeline.'),
    ).toBeVisible()
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'Data from Wikidata, CC0. Every event links to its source.',
    )
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      `${import.meta.env.BASE_URL}about/`,
    )
  })

  it('keeps a typed subject in the search field', async () => {
    const user = userEvent.setup()
    renderApp()

    const search = screen.getByRole('combobox', { name: 'Subject' })
    await user.type(search, 'London')

    expect(search).toHaveValue('London')
    expect(
      await screen.findByText(
        'No matching subject. Check the spelling or try another name.',
      ),
    ).toBeVisible()
  })

  it('shows the picked subject and does not load a timeline', async () => {
    const user = userEvent.setup()
    const { source, fetchBatch } = sourceFor((text) =>
      text === 'Marie Cu' ? [marie] : [],
    )
    renderApp(source)

    const search = screen.getByRole('combobox', { name: 'Subject' })
    await user.type(search, 'Marie Cu')
    await screen.findByRole('option', { name: /Marie Curie/ })
    await user.keyboard('{Enter}')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Marie Curie' }),
    ).toBeVisible()
    expect(screen.getByText('Q7186')).toBeVisible()
    expect(screen.getByText(marie.description)).toBeVisible()
    expect(fetchBatch).not.toHaveBeenCalled()
  })

  it('shows a no-match message and leaves the empty state in place', async () => {
    const user = userEvent.setup()
    const { source, fetchBatch } = sourceFor(() => [])
    renderApp(source)

    await user.type(screen.getByRole('combobox', { name: 'Subject' }), 'zzqqxx')
    expect(
      await screen.findByText(
        'No matching subject. Check the spelling or try another name.',
      ),
    ).toBeVisible()
    expect(
      screen.getByText('Search for a Wikidata subject to see its timeline.'),
    ).toBeVisible()
    expect(fetchBatch).not.toHaveBeenCalled()
  })

  it('explains gathering, limits, and unencrypted notes on About', () => {
    window.history.pushState({}, '', '/chronicle/about/')
    renderApp()

    expect(
      screen.getByRole('heading', { level: 1, name: 'About' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Chronicle' })).toHaveAttribute(
      'href',
      import.meta.env.BASE_URL,
    )
    expect(
      screen.getByText(/asks Wikidata for every dated item/i),
    ).toBeVisible()
    expect(
      screen.getByText(
        'A date range does not make a broad subject loadable. Wikidata gathers every linked item before it applies the dates, so a shorter window costs as much as the whole subject.',
      ),
    ).toBeVisible()
    expect(screen.getByText(/Scholarly articles are missing/i)).toBeVisible()
    expect(screen.getByText(/They are not encrypted/i)).toBeVisible()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('CC0')
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.queryByRole('combobox', { name: 'Subject' }),
    ).not.toBeInTheDocument()
  })
})
