/**
 * Time source for request pacing. Tests pass a clock they can move forward.
 */

export interface Clock {
  now(): number
  sleep(ms: number, signal?: AbortSignal): Promise<void>
}

export function systemClock(): Clock {
  return {
    now: () => Date.now(),
    sleep(ms: number, signal?: AbortSignal): Promise<void> {
      if (signal?.aborted) return Promise.reject(abortError())
      if (ms <= 0) return Promise.resolve()
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }, ms)
        const onAbort = () => {
          clearTimeout(timer)
          reject(abortError())
        }
        signal?.addEventListener('abort', onAbort, { once: true })
      })
    },
  }
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}
