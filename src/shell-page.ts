export type ShellPage = 'home' | 'about'

export function shellPage(pathname: string): ShellPage {
  const withoutFile = pathname.replace(/\/index\.html$/i, '')
  const withSlash = withoutFile.endsWith('/') ? withoutFile : `${withoutFile}/`
  return withSlash.endsWith('/about/') ? 'about' : 'home'
}
