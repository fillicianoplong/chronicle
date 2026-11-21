import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')

const textPairs = [
  ['c-text', 'c-bg', 18.07, 17.68],
  ['c-text', 'c-surface', 18.07, 17.68],
  ['c-text-muted', 'c-bg', 8.52, 7.83],
  ['c-text-muted', 'c-surface-2', 7.79, 7.16],
  ['c-accent', 'c-bg', 6.0, 6.41],
  ['c-on-accent', 'c-accent', 6.27, 6.41],
  ['c-text', 'c-selected', 16.32, 16.48],
  ['c-accent', 'c-selected', 5.42, 5.98],
  ['c-warning', 'c-warning-soft', 6.32, 7.18],
  ['c-danger', 'c-danger-soft', 5.13, 5.21],
  ['c-danger', 'c-bg', 6.0, 6.41],
  ['c-success', 'c-bg', 4.86, 8.93],
  ['c-text', 'c-tag', 16.53, 16.16],
] as const

const controlPairs = [
  ['c-border-strong', 'c-bg', 18.07, 17.68],
  ['c-focus', 'c-bg', 18.07, 17.68],
] as const

type Theme = Record<string, string>

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function readHexVars(css: string): Theme {
  const vars: Theme = {}
  const pattern = /--([A-Za-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})\b/g
  for (const match of css.matchAll(pattern)) {
    const name = match[1]
    const hex = match[2]
    if (!name || !hex) continue
    vars[name] = hex.toUpperCase()
  }
  return vars
}

function readCustomProperties(css: string): Theme {
  const vars: Theme = {}
  const pattern = /--([A-Za-z0-9-]+)\s*:\s*([^;]+);/g
  for (const match of css.matchAll(pattern)) {
    const name = match[1]
    const raw = match[2]
    if (!name || !raw) continue
    const value = raw
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/#[0-9A-Fa-f]{3,8}\b/g, (hex) => hex.toUpperCase())
      .replaceAll('"', "'")
    vars[name] = value
  }
  return vars
}

function themeBlocks(css: string): { light: string; dark: string } {
  const clean = stripComments(css)
  const parts = clean.split(/@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)/)
  const darkRoot = (parts[1] ?? '').match(/:root\s*\{([^}]*)\}/)
  return { light: parts[0] ?? '', dark: darkRoot?.[1] ?? '' }
}

function readThemes(css: string): { light: Theme; dark: Theme } {
  const clean = stripComments(css)
  const parts = clean.split(/@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)/)
  const light = readHexVars(parts[0] ?? '')
  const dark: Theme = { ...light }
  const darkRoot = (parts[1] ?? '').match(/:root\s*\{([^}]*)\}/)
  if (!darkRoot?.[1]) {
    throw new Error('Dark theme block has no :root rule')
  }
  Object.assign(dark, readHexVars(darkRoot[1]))
  return { light, dark }
}

function channel(value: number): number {
  const unit = value / 255
  if (unit <= 0.04045) return unit / 12.92
  return ((unit + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = channel((value >> 16) & 255)
  const green = channel((value >> 8) & 255)
  const blue = channel(value & 255)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function cssFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      found.push(...cssFiles(full))
    } else if (entry.endsWith('.css')) {
      found.push(full)
    }
  }
  return found
}

describe('design tokens', () => {
  const appTokens = readFileSync(
    path.join(root, 'src/styles/tokens.css'),
    'utf8',
  )
  const themes = readThemes(appTokens)

  it('copies the locked token and font files', () => {
    const designTokens = readFileSync(
      path.join(root, 'docs/ui/tokens.css'),
      'utf8',
    )
    const shipped = themeBlocks(appTokens)
    const design = themeBlocks(designTokens)
    expect(readCustomProperties(shipped.light)).toEqual(
      readCustomProperties(design.light),
    )
    expect(readCustomProperties(shipped.dark)).toEqual(
      readCustomProperties(design.dark),
    )

    const shippedFonts = readFileSync(
      path.join(root, 'src/styles/fonts-plakat.css'),
      'utf8',
    )
    const designFonts = readFileSync(
      path.join(root, 'docs/ui/fonts-plakat.css'),
      'utf8',
    )
    const fontUrls = (css: string) =>
      [...css.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1])
    expect(fontUrls(shippedFonts)).toEqual(fontUrls(designFonts))
    expect(shippedFonts).not.toContain('U+0000-00FF')

    const fontDir = path.join(root, 'docs/ui/fonts')
    for (const name of readdirSync(fontDir)) {
      const design = readFileSync(path.join(fontDir, name))
      const shipped = readFileSync(path.join(root, 'src/styles/fonts', name))
      expect(Buffer.compare(design, shipped)).toBe(0)
    }
  })

  it('keeps the Plakat light and dark palette', () => {
    expect(themes.light['c-bg']).toBe('#FAFAF8')
    expect(themes.light['c-text']).toBe('#111111')
    expect(themes.light['c-text-muted']).toBe('#4A4A46')
    expect(themes.light['c-accent']).toBe('#C40000')
    expect(themes.light['c-on-accent']).toBe('#FFFFFF')

    expect(themes.dark['c-bg']).toBe('#0A0A0A')
    expect(themes.dark['c-text']).toBe('#F2F2F2')
    expect(themes.dark['c-text-muted']).toBe('#A3A3A0')
    expect(themes.dark['c-accent']).toBe('#FF5A45')
    expect(themes.dark['c-on-accent']).toBe('#0A0A0A')
    expect(themes.dark['c-on-accent']).not.toBe('#FFFFFF')
    expect(contrast('#FFFFFF', '#FF5A45')).toBeLessThan(4.5)
  })

  it('meets text contrast of 4.5:1 and control contrast of 3:1', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const theme = themes[scheme]
      for (const [foreground, background, light, dark] of textPairs) {
        const ratio = contrast(theme[foreground] ?? '', theme[background] ?? '')
        const expected = scheme === 'light' ? light : dark
        expect(
          ratio,
          `${scheme} ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5)
        expect(ratio).toBeCloseTo(expected, 1)
      }
      for (const [edge, background, light, dark] of controlPairs) {
        const ratio = contrast(theme[edge] ?? '', theme[background] ?? '')
        const expected = scheme === 'light' ? light : dark
        expect(
          ratio,
          `${scheme} ${edge} on ${background}`,
        ).toBeGreaterThanOrEqual(3)
        expect(ratio).toBeCloseTo(expected, 1)
      }
    }
  })

  it('keeps every other stylesheet on token names', () => {
    const offenders: string[] = []
    for (const file of cssFiles(path.join(root, 'src'))) {
      if (file.endsWith(`${path.sep}tokens.css`)) continue
      const css = stripComments(readFileSync(file, 'utf8'))
      if (
        /#[0-9A-Fa-f]{3,8}\b/.test(css) ||
        /\b(?:rgb|hsl|hwb)a?\(/.test(css)
      ) {
        offenders.push(path.relative(root, file))
      }
    }
    expect(offenders).toEqual([])
  })

  it('references only the self-hosted font files', () => {
    const css = readFileSync(
      path.join(root, 'src/styles/fonts-plakat.css'),
      'utf8',
    )
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1])
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(url?.startsWith('./fonts/')).toBe(true)
      expect(url?.endsWith('.woff2')).toBe(true)
      const file = path.join(root, 'src/styles', url ?? '')
      expect(statSync(file).size).toBeGreaterThan(0)
    }
  })
})
