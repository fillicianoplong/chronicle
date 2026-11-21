import { readFileSync } from 'node:fs'

/**
 * SPDX ids named in the SRS license reference.
 * An OR expression is allowed when one side is. An AND expression is allowed
 * only when every side is.
 */
export const REFERENCE_LICENSES = new Set([
  'MIT',
  'Apache-2.0',
  'MPL-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'CC0',
])

/**
 * Permissive or data licenses already pulled in by the toolchain, pinned to
 * the package path. They are not in the license reference. A new package that
 * uses one of these licenses still fails until it is reviewed.
 */
export const TOOLCHAIN_EXCEPTIONS = new Map([
  ['node_modules/tslib', '0BSD'],
  ['node_modules/caniuse-lite', 'CC-BY-4.0'],
  ['node_modules/minimatch', 'BlueOak-1.0.0'],
  ['node_modules/jsdom/node_modules/lru-cache', 'BlueOak-1.0.0'],
  ['node_modules/@isaacs/nonrecursive-glob-match', 'BlueOak-1.0.0'],
])

function normalize(expression) {
  return expression.replace(/\s+/g, ' ').trim()
}

function stripMatchingParens(expression) {
  let value = expression
  while (value.startsWith('(') && value.endsWith(')')) {
    let depth = 0
    let wrapsAll = true
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] === '(') depth += 1
      else if (value[index] === ')') depth -= 1
      if (depth === 0 && index < value.length - 1) {
        wrapsAll = false
        break
      }
    }
    if (!wrapsAll || depth !== 0) break
    value = value.slice(1, -1).trim()
  }
  return value
}

function splitTop(expression, operator) {
  const token = ` ${operator} `
  const parts = []
  let depth = 0
  let start = 0
  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index]
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    else if (depth === 0 && expression.startsWith(token, index)) {
      parts.push(expression.slice(start, index).trim())
      index += token.length - 1
      start = index + 1
    }
  }
  parts.push(expression.slice(start).trim())
  return parts.filter((part) => part.length > 0)
}

export function expressionAllowed(expression) {
  if (typeof expression !== 'string') return false
  const value = stripMatchingParens(normalize(expression))
  if (value.length === 0) return false
  const orParts = splitTop(value, 'OR')
  if (orParts.length > 1) return orParts.some(expressionAllowed)
  const andParts = splitTop(value, 'AND')
  if (andParts.length > 1) return andParts.every(expressionAllowed)
  if (value.includes(' WITH ')) return false
  return REFERENCE_LICENSES.has(value)
}

function licenseText(license) {
  if (typeof license === 'string') return license
  if (Array.isArray(license)) return license.map(licenseText).join(' AND ')
  if (
    license &&
    typeof license === 'object' &&
    typeof license.type === 'string'
  ) {
    return license.type
  }
  return ''
}

export function packageAllowed(packagePath, license) {
  const text = licenseText(license)
  if (expressionAllowed(text)) return true
  return TOOLCHAIN_EXCEPTIONS.get(packagePath) === text
}

export function checkLockfile(lock) {
  const problems = []
  const packages = lock.packages ?? {}
  for (const [packagePath, pkg] of Object.entries(packages)) {
    if (packagePath === '') continue
    if (!packageAllowed(packagePath, pkg.license)) {
      const text = licenseText(pkg.license)
      problems.push(`${packagePath}: ${text || 'missing license'}`)
    }
  }
  return problems
}

function isDirectRun() {
  const entry = process.argv[1]
  return typeof entry === 'string' && entry.endsWith('check-licenses.mjs')
}

if (isDirectRun()) {
  const lock = JSON.parse(
    readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'),
  )
  const problems = checkLockfile(lock)
  if (problems.length > 0) {
    console.error('License check failed:')
    for (const problem of problems) console.error(`- ${problem}`)
    process.exit(1)
  }
  const count = Object.keys(lock.packages).filter((name) => name !== '').length
  console.log(`License check passed (${String(count)} packages).`)
}
