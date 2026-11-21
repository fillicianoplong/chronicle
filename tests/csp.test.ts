import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')

function policy(html: string): string {
  const marker = 'http-equiv="Content-Security-Policy"'
  const at = html.indexOf(marker)
  const start = html.lastIndexOf('<meta', at)
  const end = html.indexOf('>', at)
  const tag = at >= 0 ? html.slice(start, end + 1) : ''
  const content = tag.match(/content="([^"]*)"/)?.[1]
  if (!content) throw new Error('Content-Security-Policy meta tag is missing')
  return content
}

describe('content security policy', () => {
  const home = policy(readFileSync(path.join(root, 'index.html'), 'utf8'))
  const about = policy(
    readFileSync(path.join(root, 'about/index.html'), 'utf8'),
  )

  it('uses the same policy on the home and about pages', () => {
    expect(about).toBe(home)
  })

  it('allows this site, the Wikidata hosts, and upgrades insecure requests', () => {
    expect(home).toContain("default-src 'self'")
    expect(home).toContain("script-src 'self'")
    expect(home).toContain("style-src 'self'")
    expect(home).toContain("font-src 'self'")
    expect(home).toContain('upgrade-insecure-requests')

    const connect = home
      .match(/connect-src\s+([^;]+)/)?.[1]
      ?.trim()
      .split(/\s+/)
    expect(connect).toEqual([
      'https://query.wikidata.org',
      'https://www.wikidata.org',
    ])
  })
})
