import { shellPage, type ShellPage } from './shell-page.ts'

const homeHref = import.meta.env.BASE_URL
const aboutHref = `${import.meta.env.BASE_URL}about/`

export function App() {
  const page = shellPage(window.location.pathname)

  return (
    <div className="page">
      <div className="top-rule" aria-hidden="true" />
      <SiteHeader page={page} />
      <main>{page === 'about' ? <About /> : <Home />}</main>
      <SiteFooter page={page} />
    </div>
  )
}

function SiteHeader({ page }: { page: ShellPage }) {
  return (
    <header className="site-header">
      {page === 'home' ? (
        <h1 className="brand">
          <a href={homeHref}>Chronicle</a>
        </h1>
      ) : (
        <a className="brand" href={homeHref}>
          Chronicle
        </a>
      )}
      {page === 'home' ? <SubjectSearch /> : null}
    </header>
  )
}

function SubjectSearch() {
  return (
    <form
      className="subject-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <label className="visually-hidden" htmlFor="subject">
        Subject
      </label>
      <div className="subject-search-row">
        <SearchIcon />
        <input
          id="subject"
          name="subject"
          type="search"
          placeholder="Search a person, place, or topic"
          autoComplete="off"
        />
        <button type="submit">Search</button>
      </div>
    </form>
  )
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="6.75"
        cy="6.75"
        r="4.4"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.2 10.2L14 14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
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
