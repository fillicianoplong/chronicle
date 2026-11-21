import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SubjectHit } from '../data/TimelineSource.ts'
import { SubjectSearch } from './SubjectSearch.tsx'

const marie: SubjectHit = {
  id: 'Q7186' as SubjectHit['id'],
  label: 'Marie Curie',
  description: 'Polish-born French physicist and chemist (1867–1934)',
}

const university: SubjectHit = {
  id: 'Q1613719' as SubjectHit['id'],
  label: 'Maria Curie-Skłodowska University',
  description: 'Polish university',
}

function sourceWith(hits: SubjectHit[]) {
  return {
    searchSubjects: vi.fn((text: string) =>
      Promise.resolve(text === 'Marie Cu' ? hits : []),
    ),
    searchProperties: () => Promise.resolve([]),
    fetchBatch: vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        error: { kind: 'badShape' as const, detail: 'not used' },
      }),
    ),
    fetchLabels: () => Promise.resolve(new Map()),
  }
}

describe('SubjectSearch', () => {
  it('opens the highlighted suggestion with Enter', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    const source = sourceWith([marie, university])
    render(<SubjectSearch source={source} onPick={onPick} />)

    const box = screen.getByRole('combobox', { name: 'Subject' })
    await user.type(box, 'Marie Cu')
    const first = await screen.findByRole('option', { name: /Marie Curie/ })
    expect(first).toHaveTextContent('Q7186')
    expect(first).toHaveTextContent(marie.description)
    expect(box).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{ArrowDown}')
    expect(
      screen.getByRole('option', { name: /Maria Curie-Skłodowska University/ }),
    ).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')
    expect(onPick).toHaveBeenCalledWith(university)
    expect(source.fetchBatch).not.toHaveBeenCalled()
  })

  it('closes suggestions on Escape and keeps the typed text', async () => {
    const user = userEvent.setup()
    render(<SubjectSearch source={sourceWith([marie])} onPick={vi.fn()} />)

    const box = screen.getByRole('combobox', { name: 'Subject' })
    await user.type(box, 'Marie Cu')
    await screen.findByRole('option', { name: /Marie Curie/ })
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(box).toHaveValue('Marie Cu')
    expect(box).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows a no-match message and does not ask for a timeline', async () => {
    const user = userEvent.setup()
    const source = sourceWith([])
    render(<SubjectSearch source={source} onPick={vi.fn()} />)

    await user.type(screen.getByRole('combobox', { name: 'Subject' }), 'zzqqxx')
    expect(
      await screen.findByText(
        'No matching subject. Check the spelling or try another name.',
      ),
    ).toBeVisible()
    expect(source.fetchBatch).not.toHaveBeenCalled()
    expect(source.searchSubjects).toHaveBeenCalledWith(
      'zzqqxx',
      expect.any(AbortSignal),
    )
  })
})
