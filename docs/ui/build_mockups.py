"""Build the Chronicle UI mockups: HTML pages in ui/mockups/, PNGs in images/ui-*.png.
Example data only. Run: python3 build_mockups.py"""
import re, subprocess
from pathlib import Path

UI = Path(__file__).resolve().parent
OUTHTML = UI / "mockups"; OUTHTML.mkdir(exist_ok=True)
IMAGES = UI.parent / "images"; IMAGES.mkdir(exist_ok=True)
TOKENS = (UI / "tokens.css").read_text()
APP = (UI / "app.css").read_text()
DARK = re.search(r"@media \(prefers-color-scheme: dark\) \{\s*(:root \{.*?\n  \})", TOKENS, re.S).group(1)

def ic(name, cls=""):
    svg = (UI / "icons" / f"{name}.svg").read_text()
    svg = re.sub(r"<!--.*?-->", "", svg, flags=re.S)
    return svg.replace('class="lucide', f'aria-hidden="true" class="ic {cls} lucide', 1)

def co(n, top=-10, left=-10):
    return f'<b class="co" style="top:{top}px;left:{left}px">{n}</b>'

def page(name, body, url, w=1280, h=800, dark=False, extra_css=""):
    css = TOKENS + ("\n" + DARK if dark else "") + "\n" + APP + "\n" + extra_css
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{name}</title>
<style>{css}</style></head><body><div class="frame"><div class="chrome"><div class="dots"><i></i><i></i><i></i></div>
<div class="url">{url}</div></div><div class="page">{body}</div></div></body></html>"""
    f = OUTHTML / f"{name}.html"; f.write_text(html)
    png = IMAGES / f"{name}.png"
    subprocess.run(["google-chrome", "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
                    f"--window-size={w},{h}", "--force-device-scale-factor=1.5", f"--screenshot={png}",
                    f.as_uri()], check=True, capture_output=True)
    print("rendered", png.name)

U = "fillicianoplong.github.io/chronicle/"
def url(q=""):
    return f"https://{U}<b>{q}</b>" if q else f"https://{U}"

def header(search_val="Marie Curie", focus=False, menu_btn=True, cos=None):
    cos = cos or {}
    return f"""<header class="hdr rel">{cos.get('brand','')}<a class="brand"><span class="mark"></span>Chronicle</a>
<div class="input rel{' focus' if focus else ''}" style="width:420px">{cos.get('search','')}{ic('search','s')}<span>{search_val}</span></div>
<span class="grow"></span>
<span class="rel">{cos.get('file','')}<span class="btn">{ic('file-json','s')}File</span></span>
<a class="small">About</a></header>"""

def subject(cos=""):
    return f"""<section class="subj rel">{cos}<h1>Marie Curie <span class="q muted mono">Q7186</span></h1>
<p class="muted small">Polish and naturalised-French physicist and chemist · <a>Wikidata ↗</a></p></section>"""

def filters(cos=""):
    return f"""<aside class="filters rel">{cos}
<div><p class="fl">Text</p><div class="input" style="margin-top:6px">{ic('search','s')}<span>radium</span></div></div>
<div><p class="fl">Relationship</p>
<div style="margin-top:6px;display:flex;flex-direction:column;gap:6px">
<label class="opt"><span class="chk on"></span>main subject<span class="n">412</span></label>
<label class="opt"><span class="chk on"></span>author<span class="n">96</span></label>
<label class="opt"><span class="chk"></span>named after<span class="n">58</span></label>
<label class="opt"><span class="chk"></span>notable work<span class="n">12</span></label>
<a class="small">Show all 14</a></div></div>
<div><p class="fl">Dates</p><div style="display:flex;gap:8px;margin-top:6px"><div class="input" style="width:50%"><span>1890</span></div><div class="input" style="width:50%"><span class="ph">To</span></div></div>
<p class="xs muted" style="margin:4px 0 0">A year, or a full date such as 1903-12-10</p></div>
<div><p class="fl">Tags</p><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><span class="chip tag">thesis</span><span class="chip tag">awards</span></div></div>
<div><p class="fl">Sort</p><div class="seg" style="margin-top:6px"><span class="on">Oldest first</span><span>Newest first</span></div></div>
<a class="small">Clear all filters</a></aside>"""

def row(date, prec, label, desc, rels, sel=False, tags=(), note=None, idlabel=False, cos=""):
    meta = "".join(f'<span class="chip rel">{r}</span>' for r in rels) + "".join(f'<span class="chip tag">{t}</span>' for t in tags)
    lbl = f'<span class="lbl{" id" if idlabel else ""}">{label}</span>'
    d = f'<p class="desc" style="margin:2px 0 0">{desc}</p>' if desc else ""
    n = f'<p class="note">{note}</p>' if note else ""
    return f"""<div class="row rel{' sel' if sel else ''}">{cos}<span class="chk{' on' if sel else ''}"></span>
<div class="date">{date}<span class="p">{prec}</span></div>
<div>{lbl} <a class="xs">Wikidata ↗</a>{d}<div class="meta">{meta}</div>{n}</div>
<div class="acts"><span class="btn ghost icon sm" title="Note">{ic('sticky-note','s')}</span><span class="btn ghost icon sm" title="Tags">{ic('tag','s')}</span></div></div>"""

ROWS = [
    ("1898", "year · publication date", "Sur une nouvelle substance fortement radio-active", "scholarly article (example)", ["author"], True, ["discovery"], None),
    ("1903", "year · publication date", "Recherches sur les substances radioactives", "doctoral thesis (example)", ["author"], True, ["thesis"], "Compare with the English translation of 1904."),
    ("10 Dec 1903", "day · point in time", "1903 Nobel Prize in Physics", "award ceremony (example)", ["main subject", "participant"], False, ["awards"], None),
    ("1910s", "decade · inception", "Radium Institute building", "building (example)", ["named after"], False, [], None),
    ("Dec 1911", "month · point in time", "1911 Nobel Prize in Chemistry", "award ceremony (example)", ["main subject"], True, ["awards"], None),
    ("1943", "year · publication date", "Madame Curie", "film (example)", ["main subject"], False, [], None),
]

def list_rows(rows=ROWS, first_cos=""):
    out = []
    for i, r in enumerate(rows):
        out.append(row(*r, cos=first_cos if i == 0 else ""))
    return "".join(out)

def toolbar(cos=None, view="list", counts="508 of 1,214 events match · 3 selected"):
    cos = cos or {}
    l, t = ("tab on", "tab") if view == "list" else ("tab", "tab on")
    return f"""<div class="toolbar rel">{cos.get('tabs','')}<div class="tabs"><span class="{l}">{ic('list','s')}List</span><span class="{t}">{ic('chart-gantt','s')}Visual timeline</span></div>
<span class="grow"></span>{cos.get('count','')}<span class="muted num rel">{counts}</span>
<label class="opt rel">{cos.get('selall','')}<span class="chk mixed"></span>Select page</label>
<span class="btn sm">{ic('link','s')}Copy link</span></div>"""

def pager(cos="", pg="3", total="11"):
    return f"""<nav class="pager rel" aria-label="Pages">{cos}<span class="btn sm icon">{ic('chevrons-left','s')}</span><span class="btn sm icon">{ic('chevron-left','s')}</span>
<span class="num">Page <b>{pg}</b> of {total}</span><span class="btn sm icon">{ic('chevron-right','s')}</span><span class="btn sm icon">{ic('chevrons-right','s')}</span>
<span class="grow"></span><span class="muted xs">50 events per page</span></nav>"""

FOOT = '<footer class="footer"><span>Data from Wikidata, CC0. Every event links to its source.</span><span class="grow"></span><span>Example data</span></footer>'

def selbar(cos=""):
    return f"""<div class="selbar">{cos}<span class="num"><b>3</b> selected</span><span class="btn sm">Select all 508 filtered</span>
<span class="btn sm">Clear</span><span class="btn sm">Selected only</span><span class="btn primary sm">{ic('download','s')}Export selected</span></div>"""

def loaded_body(cos=True, extra="", rows=ROWS, loadbar=None):
    c = (lambda n, t=-10, l=-10: co(n, t, l)) if cos else (lambda *a, **k: "")
    lb = loadbar if loadbar is not None else f"""<div class="loadbar rel">{c(4,6,8)}{ic('clock','s')}<span class="muted">Loaded 1,214 events in 1 batch · fetched today 10:42 ·</span><a>Refresh</a></div>"""
    return (header(cos={"search": c(1, -10, -10), "file": c(2, -10, -10)}) + subject(c(3, 8, 4)) + lb +
            f'<div class="body">{filters(c(5, 6, 6))}<div class="main rel">{toolbar({"tabs": c(6, -2, 4), "count": ""})}'
            f'<div class="list">{list_rows(rows, c(7, 4, 2))}</div>{pager(c(9, -6, 4))}</div></div>{FOOT}'
            + (f'<div style="position:absolute;left:0;right:0;bottom:64px;height:0" class="rel">{selbar(c(8, -12, -12))}</div>' if True else "")
            + extra)

def main():
    # directions --------------------------------------------------------
    base = loaded_body(cos=False)
    page("ui-direction-a", base, url("?q=Q7186&page=3"))
    archive = """:root{--c-bg:#FBF8F2;--c-surface:#F3EEE4;--c-surface-2:#E9E2D4;--c-border:#D9D0BF;--c-accent:#1D5C63;--c-accent-soft:#E1EEEE;--c-selected:#E9F1EF;--c-tag:#EDE6D8}
.subj h1,.brand{font-family:"Source Serif Pro",Georgia,serif}.row .lbl{font-family:"Source Serif Pro",Georgia,serif;font-size:17px}"""
    page("ui-direction-b", base, url("?q=Q7186&page=3"), extra_css=archive)
    ledger = """.row{grid-template-columns:18px 110px 1fr auto;padding-top:6px;padding-bottom:6px;min-height:40px}.row .date{font-family:"JetBrains Mono",monospace;font-size:13px}
.row .desc{display:inline;margin-left:8px}.row .meta{display:inline-flex;margin:0 0 0 8px}.row .note{margin-top:2px}.row .p{display:inline!important;margin-left:4px}
.list{border-left:0}.row:nth-child(even){background:var(--c-surface)}.row.sel{background:var(--c-selected)}"""
    page("ui-direction-c", base, url("?q=Q7186&page=3"), extra_css=ledger)

    # home with suggestions --------------------------------------------
    home = f"""<header class="hdr"><a class="brand"><span class="mark"></span>Chronicle</a><span class="grow"></span><span class="btn">{ic('upload','s')}Import file</span><a class="small">About</a></header>
<main style="flex:1;display:flex;flex-direction:column;align-items:center;padding-top:96px">
<h1 style="font-size:var(--fs-32);margin:0 0 8px;letter-spacing:-.01em">Every dated item linked to a subject, in order.</h1>
<p class="muted" style="margin:0 0 28px">Search Wikidata for a person, event, place, work, or organization.</p>
<div class="rel" style="width:640px">{co(1)}<div class="input lg focus">{ic('search')}<span>Marie Cu<span class="caret"></span></span></div>
<div class="menu" role="listbox" style="left:0;right:0;top:60px">{co(2,-10,-16)}
<div class="mi active"><div><div class="t">Marie Curie <span class="muted mono xs">Q7186</span></div><div class="small muted">Polish and naturalised-French physicist and chemist</div></div></div>
<div class="mi"><div><div class="t">Marie Curie <span class="muted mono xs">Q…</span></div><div class="small muted">film (example)</div></div></div>
<div class="mi"><div><div class="t">Marie Curie Hospital <span class="muted mono xs">Q…</span></div><div class="small muted">hospital (example)</div></div></div>
<div class="sep"></div><div class="mi xs muted">↑ ↓ to move · Enter to open the highlighted subject · Esc to close</div></div>
<details open class="rel" style="margin-top:250px;font-size:var(--fs-14)">{co(3,-6,-28)}<summary style="color:var(--c-text-muted)">Narrow before loading (optional)</summary>
<div style="display:flex;gap:12px;margin-top:10px"><div class="input" style="flex:1"><span class="ph">Relationship, such as author</span></div><div class="input" style="width:120px"><span class="ph">From</span></div><div class="input" style="width:120px"><span class="ph">To</span></div></div></details>
</div></main>{FOOT}"""
    page("ui-01-home", home, url())

    # fuzzy fallback ------------------------------------------------------
    fb = home.replace("Marie Cu<span class=\"caret\"></span>", "Marie Cuire<span class=\"caret\"></span>")
    fb = re.sub(r'<div class="menu" role="listbox".*?</div></div>\n<details', f'''<div class="menu" role="listbox" style="left:0;right:0;top:60px">{co(2,-10,-16)}
<div class="mi xs muted" style="padding-bottom:2px">No exact match. Close matches:</div>
<div class="mi active"><div><div class="t">Marie Curie <span class="muted mono xs">Q7186</span></div><div class="small muted">Polish and naturalised-French physicist and chemist</div></div></div>
<div class="mi"><div><div class="t">Pierre Curie <span class="muted mono xs">Q…</span></div><div class="small muted">physicist (example)</div></div></div>
<div class="sep"></div><div class="mi xs muted">Tip: you can also type a Q-ID, such as Q7186</div></div>
<details''', fb, flags=re.S)
    page("ui-02-search-fallback", fb, url())

    # no subject found
    nf = re.sub(r'<div class="menu" role="listbox".*?</div></div>\n<details', f'''<div class="menu" role="status" style="left:0;right:0;top:60px;padding:16px">{co(2,-10,-16)}
<div class="small"><b>No matching subject.</b> Check the spelling or try another name.</div></div>
<details''', fb.replace("Marie Cuire", "Xqzvt Plorbe"), flags=re.S)
    page("ui-03-no-subject", nf, url())

    # loading -------------------------------------------------------------
    lb = f"""<div class="loadbar rel" role="status">{co(1,4,8)}<div class="track"><i></i></div>
<span>Loaded <b class="num">5,000</b> events in 1 batch. More are on the way. Stop keeps what has loaded.</span><span class="muted">Labels: 312 of 5,000</span><span class="grow"></span>
<span class="btn sm rel">{co(2,-10,-10)}{ic('square-stop','s')}Stop</span></div>"""
    lrows = [ROWS[0], ROWS[1],
             ("1904", "year · publication date", "Q…", "", ["P50"], False, [], None),
             ("1906", "year · point in time", "Q…", "", ["P921"], False, [], None),
             ROWS[2]]
    rows_html = "".join(row(*r[:5], sel=False, tags=(), note=None, idlabel=(r[2] == "Q…"), cos=co(3, 4, 2) if i == 2 else "") for i, r in enumerate(lrows))
    loading = (header() + subject() + lb + f'<div class="body">{filters()}<div class="main">{toolbar(counts="5,000 events loaded so far")}'
               f'<div class="list">{rows_html}</div>{pager(pg="1", total="100 so far")}</div></div>{FOOT}')
    page("ui-04-loading", loading, url("?q=Q7186"))

    # main list ---------------------------------------------------------
    page("ui-05-timeline-list", loaded_body(), url("?q=Q7186&amp;text=radium&amp;rel=P921,P50&amp;from=1890&amp;page=3"))
    page("ui-06-timeline-list-dark", loaded_body(cos=False), url("?q=Q7186&amp;page=3"), dark=True)

    # too broad --------------------------------------------------------------
    tb = (header("United States") + f"""<section class="subj"><h1>United States <span class="q muted mono">Q30</span></h1>
<p class="muted small">country primarily located in North America · <a>Wikidata ↗</a></p></section>
<main style="padding:24px;display:flex;gap:24px;flex:1">
<div style="flex:1;max-width:640px">
<div class="banner warn rel" role="alert">{co(1)}{ic('triangle-alert')}<div class="b"><strong>This subject is too broad to load at once.</strong>
Wikidata could not sort its first 5,000 linked items within 60 seconds. Load it one relationship at a time, or Try again.</div>
<span class="btn sm rel">{co(2,-10,-10)}{ic('rotate-cw','s')}Try again</span></div>
<h2 style="font-size:var(--fs-20);margin:24px 0 8px">Load one relationship</h2>
<div class="input focus rel">{co(3)}{ic('search','s')}<span>juris<span class="caret"></span></span></div>
<div style="border:1px solid var(--c-border);border-radius:var(--r-md);margin-top:8px">
<div class="mi active" style="align-items:center"><div style="flex:1"><div class="t">applies to jurisdiction <span class="mono xs muted">P1001</span></div><div class="small muted">item, rule, or law that applies to this place</div></div><span class="btn primary sm">Load</span></div>
<div class="mi" style="align-items:center"><div style="flex:1"><div class="t">legislative body <span class="mono xs muted">P194</span></div><div class="small muted">(example)</div></div><span class="btn sm">Load</span></div>
</div>
<h3 class="fl" style="margin:24px 0 8px">Too large to load</h3>
<div class="rel" style="border:1px solid var(--c-border);border-radius:var(--r-md)">{co(4)}
<div class="mi" style="align-items:center"><div style="flex:1"><div class="t">country <span class="mono xs muted">P17</span></div><div class="small muted">Links almost every place and organization in the country.</div></div><span class="badge">Too large</span></div>
<div class="mi" style="align-items:center"><div style="flex:1"><div class="t">country of citizenship <span class="mono xs muted">P27</span></div><div class="small muted">Links every citizen.</div></div><span class="badge">Too large</span></div></div>
<p class="small muted" style="margin-top:16px">A date range does not make this subject loadable. <a>Why?</a></p></div>
<aside class="rel" style="width:340px;border:1px solid var(--c-border);border-radius:var(--r-md);padding:16px;align-self:flex-start">{co(5)}
<p class="fl" style="margin-bottom:8px">Loading by relationship</p>
<div class="opt" style="margin-bottom:6px">{ic('loader-circle','s')}applies to jurisdiction<span class="n">5,000 so far</span></div>
<p class="xs muted" style="margin:8px 0 0">Each relationship loads as its own series, with Stop and Resume.</p></aside>
</main>{FOOT}""")
    page("ui-07-too-broad", tb, url("?q=Q30"))

    # visual timeline -------------------------------------------------------------
    years = list(range(1890, 1951, 10))
    axis = "".join(f'<span style="position:absolute;left:{(y-1890)/60*100}%;top:0;transform:translateX(-50%)" class="xs muted num">{y}</span>' for y in years)
    grid = "".join(f'<i style="position:absolute;left:{(y-1890)/60*100}%;top:0;bottom:0;width:1px;background:var(--c-border)"></i>' for y in years)
    items = [(1898, 0, "Sur une nouvelle substance…", False), (1903, 1, "Recherches sur les substances…", True), (1903.9, 2, "1903 Nobel Prize in Physics", False),
             (1911.9, 0, "1911 Nobel Prize in Chemistry", False), (1914, 3, "Radium Institute building", False), (1934, 1, "date of death (subject)", False), (1937, 2, "Madame Curie (biography)", False), (1941, 0, "Madame Curie (film)", False)]
    its = "".join(f'<span style="position:absolute;left:{(y-1890)/60*100}%;top:{30+lane*44}px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:4px 8px;border-radius:var(--r-sm);font-size:13px;border:1px solid {"var(--c-accent)" if s else "var(--c-border-strong)"};background:{"var(--c-accent-soft)" if s else "var(--c-bg)"};{"outline:2px solid var(--c-focus);outline-offset:2px;" if s else ""}">{t}</span>' for y, lane, t, s in items)
    vt = (header() + subject() + f'<div class="body">{filters()}<div class="main">{toolbar(view="timeline")}'
          f"""<div style="flex:1;padding:16px 24px;display:flex;flex-direction:column;gap:12px">
<div style="display:flex;gap:8px;align-items:center" class="rel">{co(1)}<span class="btn sm icon">{ic('zoom-in','s')}</span><span class="btn sm icon">{ic('zoom-out','s')}</span><span class="btn sm">{ic('maximize-2','s')}Fit all</span><span class="muted xs">Drag or use arrow keys to pan · + and − to zoom</span></div>
<div class="rel" style="height:210px;border:1px solid var(--c-border);border-radius:var(--r-md);position:relative;overflow:hidden;background:var(--c-surface)">{co(2,6,6)}
<div style="position:absolute;inset:0 24px">{grid}<div style="position:absolute;left:0;right:0;bottom:6px;height:16px">{axis}</div>{its}</div></div>
<div class="rel" style="border:1px solid var(--c-border);border-radius:var(--r-md);padding:12px 16px">{co(3)}
<div style="display:flex;gap:12px;align-items:start"><span class="chk on"></span><div><b>1903</b> · <span class="lbl" style="font-weight:600">Recherches sur les substances radioactives</span> <a class="xs">Wikidata ↗</a>
<div class="desc small muted">doctoral thesis (example)</div><div class="meta" style="display:flex;gap:6px;margin-top:6px"><span class="chip rel">author</span><span class="chip tag">thesis</span></div></div></div></div>
</div>{pager()}</div></div>{FOOT}""")
    page("ui-08-visual-timeline", vt, url("?q=Q7186&amp;view=timeline"))

    # notes and tags drawer -------------------------------------------------------
    drawer = f"""<div class="overlay"></div><aside class="drawer" role="dialog" aria-label="Note and tags">
<div style="display:flex;align-items:center"><h2 style="margin:0;font-size:var(--fs-20)">Note and tags</h2><span class="grow"></span><span class="btn ghost icon">{ic('x')}</span></div>
<p class="small" style="margin:0"><b>1903</b> · Recherches sur les substances radioactives</p>
<div class="rel">{co(1)}<p class="fl" style="margin-bottom:6px">Note</p>
<div class="input focus" style="height:140px;align-items:flex-start;padding-top:10px;font-size:var(--fs-14)">Compare with the English translation of 1904.<span class="caret"></span></div>
<p class="xs muted num" style="margin:4px 0 0;text-align:right">44 / 2,000</p></div>
<div class="rel">{co(2)}<p class="fl" style="margin-bottom:6px">Tags</p>
<div class="input" style="flex-wrap:wrap;height:auto;min-height:40px;padding:6px 8px;gap:6px"><span class="chip tag">thesis {ic('x','s')}</span><span class="ph small">Add a tag</span></div>
<p class="xs muted" style="margin:4px 0 0">Enter adds a tag. Up to 40 characters each.</p></div>
<div class="banner warn rel" role="alert">{co(3)}{ic('triangle-alert')}<div class="b"><strong>Browser storage is full.</strong>This note is still here. Export your work, then delete saved data for other subjects.</div></div>
<p class="xs muted" style="margin:0">Notes and tags stay in this browser. They leave it only in files you export.</p>
<span class="grow"></span><div style="display:flex;gap:8px;justify-content:flex-end"><span class="btn">Cancel</span><span class="btn primary">Save</span></div></aside>"""
    page("ui-09-notes-tags", loaded_body(cos=False, extra=drawer), url("?q=Q7186&amp;page=3"))

    # file menu ---------------------------------------------------------------------
    menu = f"""<div class="menu" role="menu" style="right:72px;top:50px;width:320px">{co(1,-10,-14)}
<div class="mi"><span>{ic('download','s')}</span><div><div class="t">Export all</div><div class="xs muted">1,214 events and loading progress, as JSON</div></div></div>
<div class="mi active"><span>{ic('download','s')}</span><div><div class="t">Export selected</div><div class="xs muted">3 events with notes and tags, as a curated file</div></div></div>
<div class="sep"></div><div class="mi"><span>{ic('upload','s')}</span><div><div class="t">Import file…</div><div class="xs muted">Opens a Chronicle JSON file up to 50 MB</div></div></div>
<div class="sep"></div><div class="mi"><span>{ic('trash-2','s')}</span><div><div class="t" style="color:var(--c-danger)">Delete saved data for this subject…</div><div class="xs muted">Selection, notes, and tags</div></div></div></div>"""
    page("ui-10-file-menu", loaded_body(cos=False, extra=menu), url("?q=Q7186&amp;page=3"))

    # import error dialog -----------------------------------------------------
    dlg = f"""<div class="overlay"></div><div class="dialog" role="alertdialog" style="left:50%;top:30%;transform:translateX(-50%);width:480px">{co(1)}
<div style="display:flex;gap:12px"><span style="color:var(--c-danger)">{ic('triangle-alert')}</span><div><h2>This file could not be opened</h2>
<p class="small" style="margin:0 0 8px">It was made by a newer version of Chronicle (schemaVersion 2). This version reads version 1.</p>
<p class="xs muted mono" style="margin:0">marie-curie-curated.json · 84 KB</p></div></div>
<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px"><span class="btn">Choose another file</span><span class="btn primary">Close</span></div></div>"""
    home_bg = re.sub(r'<div class="menu" role="listbox".*?</div></div>\n<details', '<details', home, flags=re.S)
    home_bg = home_bg.replace(co(1), "").replace(co(3,-6,-28), "").replace('Marie Cu<span class="caret"></span>', '<span class="ph">Search for a subject</span>').replace(" focus", "")
    page("ui-11-import-error", home_bg + dlg, url())

    # errors -------------------------------------------------------------------
    eb = f"""<div style="padding:12px 24px 0;display:flex;flex-direction:column;gap:8px">
<div class="banner err rel" role="alert">{co(1)}{ic('triangle-alert')}<div class="b"><strong>Loading paused after an error.</strong>The events already loaded are still here. Wikidata took too long on batch 3.</div><span class="btn sm">{ic('rotate-cw','s')}Retry</span></div>
<div class="banner info rel" role="status">{co(2)}{ic('clock')}<div class="b"><strong>Wikidata is busy.</strong>Retrying in <span class="num">24</span> seconds.</div></div>
<div class="banner warn rel" role="status">{co(3)}{ic('wifi-off')}<div class="b"><strong>You appear to be offline.</strong>Loaded events still filter. Retry when connected.</div></div></div>"""
    errs = (header() + subject() + f'<div class="loadbar">{ic("clock","s")}<span class="muted">Loaded 10,000 events in 2 batches · paused</span><span class="grow"></span><span class="btn sm">{ic("play","s")}Resume</span></div>'
            + f'<div class="body">{filters()}<div class="main">{toolbar()}{eb}<div class="list">{list_rows(ROWS[:3])}</div>{pager()}</div></div>{FOOT}')
    page("ui-12-errors", errs, url("?q=Q362&amp;page=1"))

    # empty filters --------------------------------------------------------------------
    emp = (header() + subject() + f'<div class="loadbar">{ic("clock","s")}<span class="muted">Loaded 1,214 events in 1 batch</span></div>'
           + f'<div class="body">{filters()}<div class="main">{toolbar()}'
           f"""<div class="empty rel" role="status">{co(1,-4,40)}{ic('funnel')}<h2>No events match these filters</h2>
<p class="muted small">1,214 events are loaded. Try fewer words, more relationships, or a wider date range.</p><span class="btn">Clear all filters</span></div>
<span class="grow"></span></div></div>{FOOT}""")
    page("ui-13-empty-filters", emp, url("?q=Q7186&amp;text=zzz"))

    # mobile -------------------------------------------------------------------------
    mrows = "".join(f"""<div class="rel{' sel' if r[5] else ''}" style="padding:12px 16px;border-bottom:1px solid var(--c-border);display:flex;gap:12px;{'background:var(--c-selected);box-shadow:inset 3px 0 0 var(--c-accent)' if r[5] else ''}">
<span class="chk{' on' if r[5] else ''}" style="margin-top:2px"></span><div style="flex:1"><div class="small num"><b>{r[0]}</b> <span class="muted xs">{r[1].split(' · ')[0]}</span></div>
<div class="lbl" style="font-weight:600">{r[2]}</div><div class="xs muted">{r[3]} · <a>Wikidata ↗</a></div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">{''.join(f'<span class="chip rel">{x}</span>' for x in r[4])}{''.join(f'<span class="chip tag">{x}</span>' for x in r[6])}</div></div></div>""" for r in ROWS[:5])
    mob = f"""<header class="hdr" style="padding:0 16px"><a class="brand"><span class="mark"></span>Chronicle</a><span class="grow"></span><span class="btn icon">{ic('search')}</span><span class="btn icon">{ic('file-json')}</span></header>
<section class="subj" style="padding:12px 16px"><h1 style="font-size:20px">Marie Curie <span class="q muted mono">Q7186</span></h1></section>
<div class="rel" style="display:flex;gap:8px;padding:8px 16px;border-bottom:1px solid var(--c-border);align-items:center">{co(1,-2,4)}<span class="btn sm">{ic('funnel','s')}Filters · 2</span><span class="btn sm">Oldest first</span><span class="grow"></span><span class="xs muted num">508 match</span></div>
<div style="flex:1;overflow:hidden">{mrows}</div>
<div class="rel" style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--c-text);color:var(--c-bg)">{co(2,-10,4)}<span class="small"><b>3</b> selected</span><span class="grow"></span><span class="btn primary sm" style="background:var(--c-bg);color:var(--c-text)">{ic('download','s')}Export</span></div>
<nav class="pager" style="padding:8px 16px"><span class="btn sm icon">{ic('chevron-left','s')}</span><span class="num small">Page 3 of 11</span><span class="btn sm icon">{ic('chevron-right','s')}</span></nav>"""
    css_m = ".url{font-size:10px}.chrome{gap:6px}.dots{display:none}"
    page("ui-14-mobile-list", mob, url("?q=Q7186&amp;page=3"), w=360, h=760, extra_css=css_m)
    page("ui-15-mobile-list-dark", mob.replace(co(1,-2,4), "").replace(co(2,-10,4), ""), url("?q=Q7186&amp;page=3"), w=360, h=760, dark=True, extra_css=css_m)

if __name__ == "__main__":
    main()
