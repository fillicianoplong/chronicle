import { afterEach, describe, expect, it, vi } from 'vitest'
import { TYPING_PAUSE_MS, createTypingPause } from './typingPause.ts'

describe('typing pause', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns only the text that stayed through the pause', async () => {
    vi.useFakeTimers()
    const pause = createTypingPause(
      (ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms)
        }),
    )
    const first = pause.schedule('Ma')
    const second = pause.schedule('Marie Cu')
    await vi.advanceTimersByTimeAsync(TYPING_PAUSE_MS - 1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(first).resolves.toBeNull()
    await expect(second).resolves.toBe('Marie Cu')
  })

  it('drops a pending pause when invalidated', async () => {
    vi.useFakeTimers()
    const pause = createTypingPause(
      (ms) =>
        new Promise((resolve) => {
          setTimeout(resolve, ms)
        }),
    )
    const pending = pause.schedule('Marie Cu')
    pause.invalidate()
    await vi.advanceTimersByTimeAsync(TYPING_PAUSE_MS)
    await expect(pending).resolves.toBeNull()
  })
})
