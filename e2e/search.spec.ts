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
    const file = fixtureFor(parsed)
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
  ).toBeVisible({ timeout: 15_000 })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(seen.some((url) => url.includes('query.wikidata.org'))).toBe(false)
})

test('a misspelled name shows a close match under No exact match', async ({
  page,
}) => {
  const seen = await replaySearches(page)
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Subject' }).fill('Donld Trump')
  await expect(page.getByText('No exact match')).toBeVisible({
    timeout: 15_000,
  })
  await expect(
    page.getByRole('option', { name: /^Donald Trump/ }),
  ).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(seen.some((url) => url.includes('query.wikidata.org'))).toBe(false)
})

test('typing a Q-ID offers that subject', async ({ page }) => {
  const seen = await replaySearches(page)
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Subject' }).fill('Q7186')
  const option = page.getByRole('option', { name: /Marie Curie/ })
  await expect(option).toBeVisible()
  await expect(option).toContainText('Q7186')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(seen.some((url) => url.includes('query.wikidata.org'))).toBe(false)
})

function fixtureFor(url: URL): string | null {
  if (url.hostname !== 'www.wikidata.org') return null
  const action = url.searchParams.get('action')
  const search = url.searchParams.get('search') ?? ''
  const srsearch = url.searchParams.get('srsearch') ?? ''
  const ids = url.searchParams.get('ids') ?? ''
  if (action === 'wbsearchentities') {
    if (search === 'Marie Cu') return 'search-marie-cu.json'
    if (search === 'zzqqxx') return 'search-zzqqxx.json'
    if (search === 'Donld Trump') return 'search-donld-trump.json'
    return null
  }
  if (action === 'query' && url.searchParams.get('list') === 'search') {
    if (srsearch.startsWith('Donld')) return 'search-donld-trump-fuzzy.json'
    if (srsearch.startsWith('zzqqxx')) return 'search-zzqqxx-fuzzy.json'
    return null
  }
  if (action === 'wbgetentities') {
    if (ids === 'Q7186') return 'entity-q7186.json'
    if (ids.split('|').includes('Q22686')) return 'labels-donld-trump.json'
    return 'labels-zzqqxx.json'
  }
  return null
}
