import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures.ts'

test('home page loads the Chronicle shell', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Chronicle')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Chronicle' }),
  ).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Subject' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Search' })).toBeVisible()
  await expect(
    page.getByText('Search for a Wikidata subject to see its timeline.'),
  ).toBeVisible()
})

test('home page has no accessibility violations', async ({ page }) => {
  await page.goto('/')

  const results = await new AxeBuilder({ page }).analyze()

  expect(results.violations).toEqual([])
})
