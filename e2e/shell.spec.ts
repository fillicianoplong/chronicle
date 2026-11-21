import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const widths = [320, 1280, 1920]

async function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const view = globalThis as unknown as {
      document: {
        documentElement: { scrollWidth: number; clientWidth: number }
      }
    }
    const doc = view.document.documentElement
    return doc.scrollWidth - doc.clientWidth
  })
}

test('footer credits Wikidata on the home page', async ({ page }) => {
  await page.goto('/')

  const footer = page.getByRole('contentinfo')
  await expect(footer).toContainText(
    'Data from Wikidata, CC0. Every event links to its source.',
  )
  await expect(footer.getByRole('link', { name: 'About' })).toBeVisible()
})

test('about page explains the limits and credits Wikidata', async ({
  page,
}) => {
  await page.goto('about/')

  await expect(page).toHaveTitle('About · Chronicle')
  await expect(
    page.getByRole('heading', { level: 1, name: 'About' }),
  ).toBeVisible()
  await expect(
    page.getByText(/asks Wikidata for every dated item/i),
  ).toBeVisible()
  await expect(
    page.getByText('A date range does not make a broad subject loadable.'),
  ).toBeVisible()
  await expect(page.getByText(/Scholarly articles are missing/i)).toBeVisible()
  await expect(page.getByText(/not encrypted/i)).toBeVisible()
  await expect(page.getByRole('contentinfo')).toContainText('Wikidata')
  await expect(page.getByRole('contentinfo')).toContainText('CC0')
  await expect(page.getByRole('link', { name: 'Chronicle' })).toHaveAttribute(
    'href',
    '/chronicle/',
  )
})

test('the about link in the footer opens the about page', async ({ page }) => {
  await page.goto('/')
  await page
    .getByRole('contentinfo')
    .getByRole('link', { name: 'About' })
    .click()

  await expect(page).toHaveURL(/\/about\/?$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'About' }),
  ).toBeVisible()
})

for (const width of widths) {
  test(`home and about do not scroll sideways at ${String(width)} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 })

    await page.goto('/')
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0)

    await page.goto('about/')
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0)
  })
}
