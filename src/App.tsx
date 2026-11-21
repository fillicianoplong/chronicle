import { useState } from 'react'
import { createWikidataSource } from './data/TimelineSource.ts'
import type { SubjectHit, TimelineSource } from './data/TimelineSource.ts'
import { shellPage, type ShellPage } from './shell-page.ts'
import { PickedSubject } from './ui/PickedSubject.tsx'
import { SubjectSearch } from './ui/SubjectSearch.tsx'

const homeHref = import.meta.env.BASE_URL
const aboutHref = `${import.meta.env.BASE_URL}about/`

export function App({ source }: { source?: TimelineSource }) {
  const page = shellPage(window.location.pathname)
  const [owned] = useState<TimelineSource | null>(() =>
    source === undefined ? createWikidataSource() : null,
  )
  const active = source ?? owned
  const [subject, setSubject] = useState<SubjectHit | null>(null)
  if (!active) {
    throw new Error('A subject source is required')
  }

  return (
    <div className="page">
      <div className="top-rule" aria-hidden="true" />
      <SiteHeader
        page={page}
        source={active}
        hasSubject={subject !== null}
        onPick={setSubject}
      />
      <main>
        {page === 'about' ? (
          <About />
        ) : subject ? (
          <PickedSubject subject={subject} />
        ) : (
          <Home />
        )}
      </main>
      <SiteFooter page={page} />
    </div>
  )
}

function SiteHeader({
  page,
  source,
  hasSubject,
  onPick,
}: {
  page: ShellPage
  source: TimelineSource
  hasSubject: boolean
  onPick: (subject: SubjectHit) => void
}) {
  const brandIsHeading = page === 'home' && !hasSubject
  return (
    <header className="site-header">
      {brandIsHeading ? (
        <h1 className="brand">
          <a href={homeHref}>Chronicle</a>
        </h1>
      ) : (
        <a className="brand" href={homeHref}>
          Chronicle
        </a>
      )}
      {page === 'home' ? (
        <SubjectSearch source={source} onPick={onPick} />
      ) : null}
    </header>
  )
}

function Home() {
  return (
    <div className="empty-state">
      <h2>No subject yet</h2>
      <p>Search for a Wikidata subject to see its timeline.</p>
    </div>
  )
}

function About() {
  return (
    <article className="about">
      <h1>About</h1>
      <section>
        <h2>How events are gathered</h2>
        <p>
          Chronicle asks Wikidata for every dated item linked to a subject. Each
          event keeps the date precision Wikidata records and links back to the
          Wikidata item it came from. Labels and descriptions are shown as
          Wikidata wrote them.
        </p>
      </section>
      <section>
        <h2>Limits of a date range</h2>
        <p>
          A date range does not make a broad subject loadable. Wikidata gathers
          every linked item before it applies the dates, so a shorter window
          costs as much as the whole subject.
        </p>
      </section>
      <section>
        <h2>Scholarly articles</h2>
        <p>
          Scholarly articles are missing from these timelines. They are no
          longer part of the main Wikidata query graph, so a paper about a
          subject may not appear.
        </p>
      </section>
      <section>
        <h2>Notes in this browser</h2>
        <p>
          Notes and tags stay in this browser. They are not encrypted. A file
          you export is the copy you can keep.
        </p>
      </section>
    </article>
  )
}

function SiteFooter({ page }: { page: ShellPage }) {
  return (
    <footer className="site-footer">
      <p>Data from Wikidata, CC0. Every event links to its source.</p>
      <a href={aboutHref} aria-current={page === 'about' ? 'page' : undefined}>
        About
      </a>
    </footer>
  )
}
