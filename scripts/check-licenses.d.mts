export function expressionAllowed(expression: string): boolean

export function packageAllowed(
  packagePath: string,
  license:
    string | { type?: string } | Array<string | { type?: string }> | undefined,
): boolean

export function checkLockfile(lock: {
  packages?: Record<
    string,
    {
      license?: string | { type?: string } | Array<string | { type?: string }>
    }
  >
}): string[]
