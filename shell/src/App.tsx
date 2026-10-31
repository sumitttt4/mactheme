import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MAX_QUERY_CHARS, SCOPES, type EngineState, type Scope, type SearchRow } from '../shared/protocol';
import { Footer } from './components/Footer';
import { SearchIcon } from './components/Glyph';
import { ResultRow } from './components/ResultRow';

const LIMIT = 50;
const SCOPE_LABEL: Record<Scope, string> = { all: 'All', files: 'Files', folders: 'Folders' };
const PLACEHOLDER: Record<Scope, string> = {
  all: 'Search apps, settings, files and folders',
  files: 'Search files and folders',
  folders: 'Search folders',
};

export function App() {
  const lode = window.lode;
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [shownFor, setShownFor] = useState(''); // the query `rows` answer
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(0);
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const keyboardMoved = useRef(false);

  useEffect(() => {
    void lode.engine().then(setEngine);
    const offEngine = lode.onEngine(setEngine);
    const offShown = lode.onShown(() => {
      input.current?.focus();
      input.current?.select();
    });
    return () => {
      offEngine();
      offShown();
    };
  }, [lode]);

  // Each keystroke asks; the engine runs only the newest search, and an
  // answer to an older one is dropped here too.
  useEffect(() => {
    const text = query.trim();
    const mine = ++seq.current;
    if (!text) {
      setRows([]);
      setShownFor('');
      setTotal(0);
      setProblem(null);
      setBusy(false);
      return;
    }
    setBusy(true);
    void lode.search(query, scope, LIMIT).then((reply) => {
      if (mine !== seq.current) return;
      setBusy(false);
      if ('error' in reply) {
        if (!/newer search/.test(reply.error)) setProblem(reply.error);
        return;
      }
      setProblem(null);
      setRows(reply.results);
      setShownFor(query);
      setTotal(reply.total);
      setSelected(0);
      list.current?.scrollTo({ top: 0 });
    });
  }, [query, scope, lode]);

  // The window is as tall as what it shows.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(() => lode.resize(Math.ceil(el.getBoundingClientRect().height)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [lode]);

  useEffect(() => {
    if (!keyboardMoved.current) return;
    keyboardMoved.current = false;
    const row = rows[selected];
    if (row) document.getElementById(`row-${row.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [selected, rows]);

  const act = useCallback(
    async (row: SearchRow | undefined, how: 'open' | 'reveal') => {
      if (!row) return;
      const result = how === 'open' ? await lode.open(row.id) : await lode.reveal(row.id);
      if (!result.ok) setProblem(result.error ?? 'could not open it');
    },
    [lode],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    const move = (to: number) => {
      if (rows.length === 0) return;
      keyboardMoved.current = true;
      setSelected(((to % rows.length) + rows.length) % rows.length);
    };
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
        if (rows.length) move(Math.min(selected + 7, rows.length - 1));
        break;
      case 'PageUp':
        e.preventDefault();
        if (rows.length) move(Math.max(selected - 7, 0));
        break;
      case 'Enter':
        e.preventDefault();
        void act(rows[selected], e.ctrlKey ? 'reveal' : 'open');
        break;
      case 'Tab': {
        e.preventDefault();
        const at = SCOPES.indexOf(scope);
        setScope(SCOPES[(at + (e.shiftKey ? SCOPES.length - 1 : 1)) % SCOPES.length]!);
        break;
      }
      case 'Escape':
        e.preventDefault();
        lode.hide();
        break;
    }
  };

  const hasQuery = query.trim().length > 0;
  const current = rows[selected] ?? null;
  const stale = hasQuery && busy && shownFor !== query;

  return (
    <div className="launcher" ref={root} onKeyDown={onKeyDown}>
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
          autoFocus
          role="combobox"
          aria-expanded={rows.length > 0}
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

      {hasQuery && rows.length > 0 && (
        <>
          <div className="list-head">
            <span>{SCOPE_LABEL[scope]}</span>
            <span>{total > rows.length ? `${rows.length} of ${total.toLocaleString('en-US')}` : `${rows.length}`}</span>
          </div>
          <ul id="results" ref={list} className={`results${stale ? ' stale' : ''}`} role="listbox">
            {rows.map((row, i) => (
              <ResultRow
                key={row.id}
                row={row}
                query={shownFor}
                selected={i === selected}
                onHover={() => setSelected(i)}
                onPick={(r) => void act(r, 'open')}
              />
            ))}
          </ul>
        </>
      )}

      {hasQuery && rows.length === 0 && !busy && shownFor === query && !problem && (
        <div className="empty">
          <p className="empty-title">No matches for “{query.trim()}”</p>
          <p className="empty-sub">{scope === 'all' ? 'Check the spelling, or try fewer words.' : 'Press Tab to widen the scope.'}</p>
        </div>
      )}

      {problem && <div className="problem" role="alert">{problem}</div>}

      <Footer engine={engine} selected={hasQuery ? current : null} />
    </div>
  );
}
