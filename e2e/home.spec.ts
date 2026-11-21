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

test('self-hosted fonts load from this site', async ({ page }) => {
  await page.goto('/')
  const loaded = await page.evaluate(async () => {
    const view = globalThis as unknown as {
      document: {
        fonts: {
          ready: Promise<void>
          check: (font: string) => boolean
        }
        styleSheets: Array<{ cssRules: Array<{ cssText: string }> }>
      }
    }
    await view.document.fonts.ready
    const faces: string[] = []
    for (const sheet of view.document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (rule.cssText.includes('@font-face')) faces.push(rule.cssText)
      }
    }
    return {
      ready: view.document.fonts.check('16px "Space Grotesk"'),
      faces,
    }
  })

  expect(loaded.ready).toBe(true)
  expect(loaded.faces.length).toBeGreaterThan(0)
  for (const face of loaded.faces) {
    expect(face).toContain('/chronicle/')
    expect(face).toContain('.woff2')
    expect(face).not.toContain('fonts.gstatic.com')
    expect(face).not.toContain('fonts.googleapis.com')
  }
})
