import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures.ts'

const pages = [
  { path: '/', name: 'home' },
  { path: 'about/', name: 'about' },
] as const

const schemes = ['light', 'dark'] as const

for (const scheme of schemes) {
  for (const entry of pages) {
    test(`${entry.name} in ${scheme} mode has landmarks and no axe violations`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(entry.path)

      await expect(page.getByRole('banner')).toBeVisible()
      await expect(page.getByRole('main')).toBeVisible()
      await expect(page.getByRole('contentinfo')).toBeVisible()

      const paint = await page.evaluate(() => {
        const view = globalThis as unknown as {
          document: {
            body: unknown
            querySelector: (selector: string) => unknown
          }
          getComputedStyle: (element: unknown) => {
            backgroundColor: string
            color: string
          }
        }
        const body = view.getComputedStyle(view.document.body)
        const button = view.document.querySelector('button')
        return {
          background: body.backgroundColor,
          button: button ? view.getComputedStyle(button).color : '',
        }
      })
      expect(paint.background).toBe(
        scheme === 'light' ? 'rgb(250, 250, 248)' : 'rgb(10, 10, 10)',
      )
      if (entry.name === 'home' && scheme === 'dark') {
        expect(paint.button).toBe('rgb(10, 10, 10)')
      }

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    })
  }
}
