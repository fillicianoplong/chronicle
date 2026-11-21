import type { ESLint, Linter } from 'eslint'

export const plugin: ESLint.Plugin
export const boundaryRules: Linter.RulesRecord
export function fixtureLintConfig(): Linter.Config[]
