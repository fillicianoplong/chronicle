import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { App } from './App.tsx'

function renderApp() {
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

describe('App', () => {
  it('renders the Chronicle shell', () => {
    renderApp()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Chronicle' }),
    ).toBeVisible()
    expect(screen.getByRole('searchbox', { name: 'Subject' })).toHaveAttribute(
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

    const search = screen.getByRole('searchbox', { name: 'Subject' })
    await user.type(search, 'London')

    expect(search).toHaveValue('London')
  })

  it('leaves the empty state in place when search is submitted', async () => {
    const user = userEvent.setup()
    renderApp()

    const search = screen.getByRole('searchbox', { name: 'Subject' })
    await user.type(search, 'Q22686')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(search).toHaveValue('Q22686')
    expect(
      screen.getByText('Search for a Wikidata subject to see its timeline.'),
    ).toBeVisible()
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
      screen.queryByRole('searchbox', { name: 'Subject' }),
    ).not.toBeInTheDocument()
  })
})
