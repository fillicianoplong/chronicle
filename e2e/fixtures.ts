import { expect, test as base } from '@playwright/test'

const WIKIDATA = /https?:\/\/(?:[^/]+\.)?wikidata\.org\b/

export const test = base.extend({
  page: async ({ page }, use) => {
    const liveCalls: string[] = []
    await page.route(WIKIDATA, async (route) => {
      liveCalls.push(route.request().url())
      await route.abort('blockedbyclient')
    })
    await use(page)
    expect(
      liveCalls,
      'This test called Wikidata. Replay a recorded response instead.',
    ).toEqual([])
  },
})

export { expect }
