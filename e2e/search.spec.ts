import { readFileSync } from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

function recordedBody(name: string): string {
  const file = path.resolve(import.meta.dirname, '../tests/fixtures', name)
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
    response: { body: unknown }
  }
  return JSON.stringify(parsed.response.body)
}

async function replaySearches(page: Page): Promise<string[]> {
  const seen: string[] = []
  await page.route(/wikidata\.org/, async (route) => {
    const url = route.request().url()
    seen.push(url)
    const parsed = new URL(url)
    const search = parsed.searchParams.get('search')
    const file =
      parsed.hostname === 'www.wikidata.org' &&
      parsed.searchParams.get('action') === 'wbsearchentities'
        ? search === 'Marie Cu'
          ? 'search-marie-cu.json'
          : search === 'zzqqxx'
            ? 'search-zzqqxx.json'
            : null
        : null
    if (!file) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: recordedBody(file),
    })
  })
  return seen
}

test('typing Marie Cu and Enter opens the top suggestion', async ({ page }) => {
  const seen = await replaySearches(page)
  await page.goto('/')
  await page
    .getByRole('combobox', { name: 'Subject' })
    .pressSequentially('Marie Cu', { delay: 20 })

  const option = page.getByRole('option').first()
  await expect(option).toContainText('Marie Curie')
  await expect(option).toContainText('Q7186')
  await expect(option).toContainText('physicist')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Marie Curie' }),
  ).toBeVisible()
  await expect(page.getByText('Q7186', { exact: true })).toBeVisible()
  expect(seen.some((url) => url.includes('query.wikidata.org'))).toBe(false)
})

test('an unknown name shows a no-match message and sends no timeline query', async ({
  page,
}) => {
  const seen = await replaySearches(page)
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Subject' }).fill('zzqqxx')
  await expect(
    page.getByText(
      'No matching subject. Check the spelling or try another name.',
    ),
  ).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(seen.some((url) => url.includes('query.wikidata.org'))).toBe(false)
})
