import path from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'
import { fixtureLintConfig } from '../../eslint/chronicle-boundaries.js'

const root = path.resolve(import.meta.dirname, '../..')

const failing: { file: string; ruleId: string }[] = [
  {
    file: 'tests/lint/fixtures/src/ui/calls-fetch.tsx',
    ruleId: 'chronicle/only-request-gate-fetches',
  },
  {
    file: 'tests/lint/fixtures/src/core/imports-react.ts',
    ruleId: 'chronicle/no-react-in-core',
  },
  {
    file: 'tests/lint/fixtures/src/core/dangerous-html.tsx',
    ruleId: 'chronicle/no-unsafe-html',
  },
  {
    file: 'tests/lint/fixtures/src/ui/sets-inner-html.ts',
    ruleId: 'chronicle/no-unsafe-html',
  },
  {
    file: 'tests/lint/fixtures/src/ui/imports-data-internal.ts',
    ruleId: 'chronicle/no-data-internals',
  },
  {
    file: 'tests/lint/fixtures/src/core/imports-ui.ts',
    ruleId: 'chronicle/inward-imports',
  },
]

const allowed = [
  'tests/lint/fixtures/src/data/RequestGate.ts',
  'tests/lint/fixtures/src/core/imports-timeline-source.ts',
  'tests/lint/fixtures/src/ui/ok.tsx',
]

async function lint(files: string[]) {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: fixtureLintConfig(),
    ignore: false,
  })
  return eslint.lintFiles(files.map((file) => path.join(root, file)))
}

describe('layer boundary rules', () => {
  it('rejects planted violations and names the boundary rule', async () => {
    const results = await lint(failing.map((item) => item.file))

    expect(results).toHaveLength(failing.length)
    for (const item of failing) {
      const result = results.find((entry) => entry.filePath.endsWith(item.file))
      expect(result, item.file).toBeDefined()
      const message = result?.messages.find(
        (entry) => entry.ruleId === item.ruleId,
      )
      expect(message, item.file).toBeDefined()
      expect(message?.message).toContain(item.ruleId)
    }
  })

  it('allows fetch in RequestGate, the TimelineSource import, and a UI file that calls core', async () => {
    const results = await lint(allowed)

    expect(results).toHaveLength(allowed.length)
    for (const result of results) {
      expect(result.errorCount, result.filePath).toBe(0)
    }
  })
})
