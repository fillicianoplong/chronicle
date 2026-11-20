export function App() {
  return (
    <div className="page">
      <header className="site-header">
        <h1>Chronicle</h1>
      </header>
      <main>
        <form
          className="subject-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <label htmlFor="subject">Subject</label>
          <div className="subject-search-row">
            <input
              id="subject"
              name="subject"
              type="search"
              placeholder="For example, Donald Trump"
              autoComplete="off"
            />
            <button type="submit">Search</button>
          </div>
        </form>
        <p className="empty-state">
          Search for a Wikidata subject to see its timeline.
        </p>
      </main>
    </div>
  )
}
