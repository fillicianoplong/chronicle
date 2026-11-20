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
    expect(screen.getByRole('searchbox', { name: 'Subject' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Search' })).toBeVisible()
    expect(
      screen.getByText('Search for a Wikidata subject to see its timeline.'),
    ).toBeVisible()
  })

  it('keeps a typed subject in the search field', async () => {
    const user = userEvent.setup()
    renderApp()

    const search = screen.getByRole('searchbox', { name: 'Subject' })
    await user.type(search, 'Donald Trump')

    expect(search).toHaveValue('Donald Trump')
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
})
