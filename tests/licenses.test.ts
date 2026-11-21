import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  checkLockfile,
  expressionAllowed,
  packageAllowed,
} from '../scripts/check-licenses.mjs'

describe('license expressions', () => {
  it('allows a license from the reference', () => {
    expect(expressionAllowed('MIT')).toBe(true)
    expect(expressionAllowed('Apache-2.0')).toBe(true)
    expect(expressionAllowed('MPL-2.0')).toBe(true)
    expect(expressionAllowed('BSD-2-Clause')).toBe(true)
    expect(expressionAllowed('ISC')).toBe(true)
  })

  it('allows an OR expression when one side is in the reference', () => {
    expect(expressionAllowed('Apache-2.0 OR MIT')).toBe(true)
    expect(expressionAllowed('(MIT OR GPL-3.0)')).toBe(true)
    expect(expressionAllowed('GPL-3.0 OR MIT')).toBe(true)
  })

  it('rejects a license outside the reference, including AND with an allowed license', () => {
    expect(expressionAllowed('GPL-3.0')).toBe(false)
    expect(expressionAllowed('GPL-3.0 AND MIT')).toBe(false)
    expect(expressionAllowed('BlueOak-1.0.0')).toBe(false)
    expect(expressionAllowed('0BSD')).toBe(false)
    expect(expressionAllowed('')).toBe(false)
  })
})

describe('package exceptions', () => {
  it('allows the reviewed toolchain packages and rejects the same license elsewhere', () => {
    expect(packageAllowed('node_modules/tslib', '0BSD')).toBe(true)
    expect(packageAllowed('node_modules/some-new-package', '0BSD')).toBe(false)
    expect(packageAllowed('node_modules/minimatch', 'BlueOak-1.0.0')).toBe(true)
    expect(packageAllowed('node_modules/caniuse-lite', 'CC-BY-4.0')).toBe(true)
    expect(packageAllowed('node_modules/leftpad', 'GPL-3.0')).toBe(false)
  })
})

describe('lockfile', () => {
  it('accepts the current lockfile', () => {
    const lockPath = path.resolve(import.meta.dirname, '../package-lock.json')
    const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as {
      packages?: Record<string, { license?: string }>
    }
    expect(checkLockfile(lock)).toEqual([])
  })

  it('reports a planted package whose license is outside the reference', () => {
    const problems = checkLockfile({
      packages: {
        '': { license: 'MIT' },
        'node_modules/react': { license: 'MIT' },
        'node_modules/evil': { license: 'GPL-3.0' },
      },
    })
    expect(problems).toEqual(['node_modules/evil: GPL-3.0'])
  })
})
