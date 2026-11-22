import { describe, expect, it } from 'vitest'
import { isCloseLabel } from './closeLabel.ts'

describe('close labels', () => {
  it('keeps one small typo and drops a distant name', () => {
    expect(isCloseLabel('Donld Trump', 'Donald Trump')).toBe(true)
    expect(isCloseLabel('zzqqxx', 'Zzzxx')).toBe(false)
    expect(isCloseLabel('Cesar', 'Caesar')).toBe(true)
    expect(isCloseLabel('Donld Trump', 'Barron Trump')).toBe(false)
  })
})
