/** How long the search box waits after the last key before asking for matches. */
export const TYPING_PAUSE_MS = 300

/**
 * Returns the text from the latest call once `wait` has passed with no newer
 * call. Earlier calls resolve to null, so a burst of typing sends one search.
 */
export function createTypingPause(
  sleep: (ms: number) => Promise<void>,
  wait = TYPING_PAUSE_MS,
): { schedule(text: string): Promise<string | null> } {
  let generation = 0
  return {
    async schedule(text: string): Promise<string | null> {
      const mine = ++generation
      await sleep(wait)
      if (mine !== generation) return null
      return text
    },
  }
}
