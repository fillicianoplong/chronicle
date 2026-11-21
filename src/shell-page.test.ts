import { describe, expect, it } from 'vitest'
import { shellPage } from './shell-page.ts'

describe('shellPage', () => {
  it('treats the site root as home', () => {
    expect(shellPage('/chronicle/')).toBe('home')
    expect(shellPage('/chronicle/index.html')).toBe('home')
    expect(shellPage('/')).toBe('home')
  })

  it('treats the about entry as the about page', () => {
    expect(shellPage('/chronicle/about/')).toBe('about')
    expect(shellPage('/chronicle/about')).toBe('about')
    expect(shellPage('/chronicle/about/index.html')).toBe('about')
  })
})
