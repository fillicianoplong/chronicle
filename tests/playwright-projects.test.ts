import { describe, expect, it } from 'vitest'
import config from '../playwright.config.ts'

describe('Playwright projects', () => {
  it('covers Chromium, Firefox, WebKit, and mobile emulation', () => {
    const names = config.projects?.map((project) => project.name)
    expect(names).toEqual([
      'chromium',
      'firefox',
      'webkit',
      'pixel-7',
      'iphone-14',
    ])
  })
})
