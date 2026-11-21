import path from 'node:path'
import tseslint from 'typescript-eslint'

/**
 * Layer boundary rules. Dependencies point inward: UI to core to the
 * TimelineSource module. Only RequestGate may call fetch.
 */

function norm(filePath) {
  return filePath.replaceAll('\\', '/')
}

function layerOf(filePath) {
  const value = norm(filePath)
  if (value.includes('/src/ui/')) return 'ui'
  if (value.includes('/src/core/')) return 'core'
  if (value.includes('/src/data/')) return 'data'
  return null
}

function isRequestGate(filePath) {
  return norm(filePath).endsWith('/src/data/RequestGate.ts')
}

function resolveSpecifier(filename, source) {
  if (!source.startsWith('.')) return null
  return norm(path.resolve(path.dirname(filename), source))
}

function isTimelineSource(resolved) {
  return /\/src\/data\/TimelineSource(?:\.(?:ts|tsx))?$/.test(resolved)
}

function targetsDataInternal(filename, source) {
  const resolved = resolveSpecifier(filename, source)
  const spec = source.replaceAll('\\', '/')
  const candidates = [
    resolved,
    spec.startsWith('src/data/') ? `/${spec}` : spec,
  ]
  for (const candidate of candidates) {
    if (!candidate) continue
    const asPath = candidate.includes('/src/data/')
      ? candidate
      : candidate.startsWith('src/data/')
        ? `/${candidate}`
        : null
    if (!asPath || !asPath.includes('/src/data/')) continue
    if (isTimelineSource(asPath)) continue
    return true
  }
  return false
}

function targetsLayer(filename, source, layer) {
  const resolved = resolveSpecifier(filename, source)
  return resolved !== null && resolved.includes(`/src/${layer}/`)
}

function isReactModule(source) {
  return (
    source === 'react' ||
    source === 'react-dom' ||
    source.startsWith('react/') ||
    source.startsWith('react-dom/')
  )
}

function isFetchCallee(callee) {
  if (callee.type === 'Identifier' && callee.name === 'fetch') return true
  if (callee.type !== 'MemberExpression') return false
  if (
    callee.property.type === 'Identifier' &&
    callee.property.name !== 'fetch'
  ) {
    return false
  }
  if (
    callee.computed &&
    !(callee.property.type === 'Literal' && callee.property.value === 'fetch')
  ) {
    return false
  }
  if (!callee.computed && callee.property.type !== 'Identifier') return false
  return (
    callee.object.type === 'Identifier' &&
    ['window', 'globalThis', 'self', 'global'].includes(callee.object.name)
  )
}

function visitModuleSources(visitor) {
  return {
    ImportDeclaration(node) {
      if (typeof node.source.value === 'string')
        visitor(node, node.source.value)
    },
    ExportAllDeclaration(node) {
      if (typeof node.source.value === 'string')
        visitor(node, node.source.value)
    },
    ExportNamedDeclaration(node) {
      if (node.source && typeof node.source.value === 'string') {
        visitor(node, node.source.value)
      }
    },
    ImportExpression(node) {
      if (
        node.source.type === 'Literal' &&
        typeof node.source.value === 'string'
      ) {
        visitor(node, node.source.value)
      }
    },
  }
}

const onlyRequestGateFetches = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Only RequestGate may call fetch.',
    },
    messages: {
      fetch:
        'Only RequestGate may call fetch (chronicle/only-request-gate-fetches).',
    },
    schema: [],
  },
  create(context) {
    if (isRequestGate(context.filename)) return {}
    return {
      CallExpression(node) {
        if (!isFetchCallee(node.callee)) return
        context.report({ node, messageId: 'fetch' })
      },
    }
  },
}

const noReactInCore = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Core modules must not import React.',
    },
    messages: {
      react: 'Core code must not import React (chronicle/no-react-in-core).',
    },
    schema: [],
  },
  create(context) {
    if (layerOf(context.filename) !== 'core') return {}
    return visitModuleSources((node, source) => {
      if (!isReactModule(source)) return
      context.report({ node, messageId: 'react' })
    })
  },
}

const noUnsafeHtml = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ban innerHTML and dangerouslySetInnerHTML.',
    },
    messages: {
      html: 'Do not use innerHTML or dangerouslySetInnerHTML (chronicle/no-unsafe-html).',
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        const property = node.property
        const name =
          !node.computed && property.type === 'Identifier'
            ? property.name
            : node.computed && property.type === 'Literal'
              ? property.value
              : null
        if (name !== 'innerHTML') return
        context.report({ node, messageId: 'html' })
      },
      JSXAttribute(node) {
        if (
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'dangerouslySetInnerHTML'
        ) {
          context.report({ node, messageId: 'html' })
        }
      },
      Property(node) {
        const key = node.key
        const name =
          key.type === 'Identifier'
            ? key.name
            : key.type === 'Literal'
              ? key.value
              : null
        if (name !== 'dangerouslySetInnerHTML') return
        context.report({ node, messageId: 'html' })
      },
    }
  },
}

const noDataInternals = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Modules outside src/data may import TimelineSource and nothing else from that layer.',
    },
    messages: {
      internal:
        'Only src/data may import data-layer internals (chronicle/no-data-internals).',
    },
    schema: [],
  },
  create(context) {
    if (layerOf(context.filename) === 'data') return {}
    return visitModuleSources((node, source) => {
      if (!targetsDataInternal(context.filename, source)) return
      context.report({ node, messageId: 'internal' })
    })
  },
}

const inwardImports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Core and data must not import the UI layer.',
    },
    messages: {
      inward:
        'Dependencies point inward: this layer must not import the UI (chronicle/inward-imports).',
    },
    schema: [],
  },
  create(context) {
    const layer = layerOf(context.filename)
    if (layer !== 'core' && layer !== 'data') return {}
    return visitModuleSources((node, source) => {
      if (!targetsLayer(context.filename, source, 'ui')) return
      context.report({ node, messageId: 'inward' })
    })
  },
}

export const plugin = {
  meta: { name: 'chronicle-boundaries' },
  rules: {
    'only-request-gate-fetches': onlyRequestGateFetches,
    'no-react-in-core': noReactInCore,
    'no-unsafe-html': noUnsafeHtml,
    'no-data-internals': noDataInternals,
    'inward-imports': inwardImports,
  },
}

export const boundaryRules = {
  'chronicle/only-request-gate-fetches': 'error',
  'chronicle/no-react-in-core': 'error',
  'chronicle/no-unsafe-html': 'error',
  'chronicle/no-data-internals': 'error',
  'chronicle/inward-imports': 'error',
}

/** Config used to lint planted fixtures. The app config parses TypeScript itself. */
export function fixtureLintConfig() {
  return [
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
      },
      plugins: { chronicle: plugin },
      rules: boundaryRules,
    },
  ]
}
