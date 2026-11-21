import { expect, test } from './fixtures.ts'

const pages = ['/', 'about/'] as const

for (const path of pages) {
  test(`content security policy on ${path} blocks other hosts`, async ({
    page,
  }) => {
    await page.goto(path)

    const content = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content')
    expect(content).toContain('upgrade-insecure-requests')
    expect(
      content
        ?.match(/connect-src\s+([^;]+)/)?.[1]
        ?.trim()
        .split(/\s+/),
    ).toEqual(['https://query.wikidata.org', 'https://www.wikidata.org'])

    const result = await page.evaluate(async () => {
      const network = globalThis.fetch
      try {
        await network('https://example.com/', {
          signal: AbortSignal.timeout(4000),
        })
        return 'allowed'
      } catch (error) {
        return error instanceof Error ? error.name : 'blocked'
      }
    })
    expect(result).not.toBe('allowed')
  })
}
