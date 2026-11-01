import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MAX_QUERY_CHARS, SCOPES, type EngineState, type Scope, type SearchRow } from '../shared/protocol';
import { DetailPane } from './components/DetailPane';
import { Footer } from './components/Footer';
import { SearchIcon } from './components/Glyph';
import { ResultRow } from './components/ResultRow';
import { SECTION_TITLE, sectionize } from './lib/sections';

const LIMIT = 50;
const SCOPE_LABEL: Record<Scope, string> = { all: 'All', files: 'Files', folders: 'Folders' };
const PLACEHOLDER: Record<Scope, string> = {
  all: 'Search apps, settings, files and folders',
  files: 'Search files and folders',
  folders: 'Search folders',
};
// Read at render time: the web build marks the page after this module loads.
const isWebPreview = () => document.documentElement.classList.contains('web-preview');

export function App() {
  const quarry = window.quarry;
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [shownFor, setShownFor] = useState(''); // the query `rows` answer
  const [total, setTotal] = useState(0);
  const [elapsedUs, setElapsedUs] = useState(0);
  const [selected, setSelected] = useState(0);
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const keyboardMoved = useRef(false);

  const { sections, order } = useMemo(() => sectionize(rows), [rows]);

  useEffect(() => {
    void quarry.engine().then(setEngine);
    const offEngine = quarry.onEngine(setEngine);
    const offShown = quarry.onShown(() => {
      input.current?.focus();
      input.current?.select();
    });
    return () => {
      offEngine();
      offShown();
    };
  }, [quarry]);

  // The web landing page's example chips fill the box.
  useEffect(() => {
    if (!isWebPreview()) return;
    const onTry = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text !== 'string') return;
      setQuery(text.slice(0, MAX_QUERY_CHARS));
      input.current?.focus({ preventScroll: true });
    };
    window.addEventListener('quarry:try', onTry);
    return () => window.removeEventListener('quarry:try', onTry);
  }, []);

  // Each keystroke asks; the engine runs only the newest search, and an
  // answer to an older one is dropped here too.
  useEffect(() => {
    const text = query.trim();
    const mine = ++seq.current;
    setProblem(null);
    if (!text) {
      setRows([]);
      setShownFor('');
      setTotal(0);
      setBusy(false);
      return;
    }
    setBusy(true);
    void quarry.search(query, scope, LIMIT).then((reply) => {
      if (mine !== seq.current) return;
      setBusy(false);
      if ('error' in reply) {
        if (!/newer search/.test(reply.error)) setProblem(reply.error);
        return;
      }
      setRows(reply.results);
      setShownFor(query);
      setTotal(reply.total);
      setElapsedUs(reply.elapsedUs);
      setSelected(0);
      list.current?.scrollTo({ top: 0 });
    });
  }, [query, scope, quarry]);

  // The window is as tall as what it shows.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(() => quarry.resize(Math.ceil(el.getBoundingClientRect().height)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [quarry]);

  useEffect(() => {
    if (!keyboardMoved.current) return;
    keyboardMoved.current = false;
    const row = order[selected];
    if (row) document.getElementById(`row-${row.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [selected, order]);

  const act = useCallback(
    async (row: SearchRow | undefined, how: 'open' | 'reveal') => {
      if (!row) return;
      const result = how === 'open' ? await quarry.open(row.id) : await quarry.reveal(row.id);
      setProblem(result.ok ? null : (result.error ?? 'Could not open it.'));
    },
    [quarry],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    const move = (to: number) => {
      if (order.length === 0) return;
      keyboardMoved.current = true;
      setSelected(((to % order.length) + order.length) % order.length);
    };
    if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
      e.preventDefault();
      void act(order[Number(e.key) - 1], 'open');
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(selected + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(selected - 1);
        break;
      case 'PageDown':
        e.preventDefault();
        if (order.length) move(Math.min(selected + 7, order.length - 1));
        break;
      case 'PageUp':
        e.preventDefault();
        if (order.length) move(Math.max(selected - 7, 0));
        break;
      case 'Enter':
        e.preventDefault();
        void act(order[selected], e.ctrlKey ? 'reveal' : 'open');
        break;
      case 'Tab': {
        e.preventDefault();
        const at = SCOPES.indexOf(scope);
        setScope(SCOPES[(at + (e.shiftKey ? SCOPES.length - 1 : 1)) % SCOPES.length]!);
        break;
      }
      case 'Escape':
        e.preventDefault();
        if (isWebPreview() && query) setQuery('');
        else quarry.hide();
        break;
    }
  };

  const hasQuery = query.trim().length > 0;
  const current = order[selected] ?? null;
  const stale = hasQuery && busy && shownFor !== query;
  const showResults = hasQuery && order.length > 0;

  return (
    <div className={`launcher${showResults ? ' has-results' : ''}`} ref={root} onKeyDown={onKeyDown}>
      <div className="searchbar">
        <SearchIcon />
        <input
          ref={input}
          className="query"
          value={query}
          maxLength={MAX_QUERY_CHARS}
          placeholder={PLACEHOLDER[scope]}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          autoFocus={!isWebPreview()}
          role="combobox"
          aria-expanded={showResults}
          aria-controls="results"
          aria-activedescendant={current ? `row-${current.id}` : undefined}
        />
        <div className="scopes" role="tablist" aria-label="Search scope">
          {SCOPES.map((s) => (
            <button
              key={s}
              role="tab"
              tabIndex={-1}
              aria-selected={scope === s}
              className={`scope${scope === s ? ' active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setScope(s)}
            >
              {SCOPE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <div className={`progress${busy ? ' on' : ''}`} aria-hidden="true" />

      {showResults && (
        <div className="body">
          <div ref={list} id="results" className={`results${stale ? ' stale' : ''}`} role="listbox" key={shownFor + scope}>
            {sections.map((section) => (
              <section key={section.key} className="section">
                <h3 className="section-title">
                  {SECTION_TITLE[section.key]}
                  <span>{section.rows.length}</span>
                </h3>
                <ul>
                  {section.rows.map(({ row, index }) => (
                    <ResultRow
                      key={row.id}
                      row={row}
                      index={index}
                      query={shownFor}
                      selected={index === selected}
                      onHover={setSelected}
                      onPick={(i) => void act(order[i], 'open')}
                    />
                  ))}
                </ul>
              </section>
            ))}
            {total > order.length && (
              <p className="more">
                Showing {order.length} of {total.toLocaleString('en-US')}. Type more to narrow it down.
              </p>
            )}
          </div>
          {current && (
            <DetailPane row={current} onOpen={() => void act(current, 'open')} onReveal={() => void act(current, 'reveal')} />
          )}
        </div>
      )}

      {hasQuery && order.length === 0 && !busy && shownFor === query && !problem && (
        <div className="empty">
          <div className="empty-mark" aria-hidden="true">
            <SearchIcon />
          </div>
          <p className="empty-title">No matches for “{query.trim()}”</p>
          <p className="empty-sub">{scope === 'all' ? 'Check the spelling, or try fewer words.' : 'Press Tab to search everything.'}</p>
        </div>
      )}

      {problem && (
        <div className="problem" role="alert">
          {problem}
        </div>
      )}

      <Footer engine={engine} selected={hasQuery ? current : null} elapsedUs={showResults && elapsedUs > 0 ? elapsedUs : null} />
    </div>
  );
}
