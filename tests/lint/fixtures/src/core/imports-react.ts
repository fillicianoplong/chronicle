import { useState } from 'react'

export function useCoreState(): number {
  return useState(0)[0]
}
