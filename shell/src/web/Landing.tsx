import { useEffect } from 'react';
import { App } from '../App';
import './landing.css';

const TRY = ['resume', 'screenshots', 'visual studio', 'display', 'projects', 'budget'];

const SECTIONS: [string, string][] = [
  ['demo', 'Demo'],
  ['feel', 'How it feels'],
  ['inside', 'Inside'],
  ['roadmap', 'Roadmap'],
  ['questions', 'Questions'],
];

const KEYS: [string[], string][] = [
  [['Ctrl', 'Space'], 'Summon from anywhere'],
  [['↑', '↓'], 'Move through results'],
  [['↵'], 'Open'],
  [['Ctrl', '↵'], 'Show in its folder'],
  [['Ctrl', '1–9'], 'Open that row'],
  [['Tab'], 'All · Files · Folders'],
  [['Esc'], 'Back to work'],
];

const REMOTE: [string, string][] = [
  ['Update checks', 'Asks for a newer version'],
  ['Site icons', 'Fetches web-shortcut icons'],
  ['Plugin library', 'Lists plugins to install'],
  ['Translate', 'Sends text to your own API key'],
  ['Cloud embeddings', 'Sends text chunks to a provider'],
  ['LocalSend', 'Talks to devices on your network'],
];

const PHASES: [string, string, string, 'now' | 'next' | 'later'][] = [
  ['01', 'Bridge and search box', 'Names of files, folders, apps and settings, with pinyin.', 'now'],
  ['02', 'Search parity', 'Recents, type filters, query syntax, sorting, favorites, drag out.', 'next'],
  ['03', 'Content search', 'Inside Word, Excel, PowerPoint, PDF and code, with previews.', 'later'],
  ['04', 'Clipboard history', 'Text, images and files, with OCR of copied images.', 'later'],
  ['05', 'Plugins', 'Calculator, units, colors and more, each off until you turn it on.', 'later'],
  ['06', 'Windows integration', 'Double-Ctrl, search in Open/Save dialogs, autostart.', 'later'],
  ['07', 'The rest', 'Capture tools, and access for AI assistants.', 'later'],
];

const FAQ: [string, string][] = [
  [
    'Can I download it?',
    'Not yet. Lode is a personal build for one laptop, in progress. The demo on this page is the real interface running on sample data.',
  ],
  [
    'Does it work on macOS or Linux?',
    'No. It searches Windows drives by reading their NTFS file tables, and opens things the way Windows does.',
  ],
  [
    'What is WinShun?',
    'An open-source (MIT) Windows search launcher. Lode reuses its engine and index service, and replaces its interface with this one.',
  ],
  [
    'Does it send anything online?',
    'No. Nothing leaves the PC by default. Each remote feature has its own switch, off until it is turned on, with a note on what it sends.',
  ],
  [
    'Why does it need a service?',
    'Reading a drive’s file table takes administrator rights. A small Windows service does that once, installed with one consent, so the launcher itself runs with normal rights.',
  ],
];

function tryQuery(text: string) {
  window.dispatchEvent(new CustomEvent('lode:try', { detail: text }));
  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#1B1726" />
      <circle cx="14" cy="14" r="6.5" fill="none" stroke="#C4913F" strokeWidth="2.4" />
      <path d="M19 19l5 5" stroke="#C4913F" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M14 10.6l2.7 2.3-1.3 3.4h-2.8l-1.2-3.2Z" fill="#C4913F" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function Landing() {
  // Typing anywhere on the page goes to the demo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || e.key === ' ') return;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SUMMARY' || target.isContentEditable)) return;
      document.querySelector<HTMLInputElement>('.demo .query')?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="site">
      <header className="nav">
        <div className="nav-inner">
          <a className="brand" href="#top">
            <Mark />
            Lode
          </a>
          <nav className="nav-links" aria-label="Sections">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <a className="btn-dark" href="#demo">
            Try the demo
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <p className="badge-line">
            <span className="badge-new">Phase 1</span>
            Search box and engine bridge, in progress
          </p>
          <h1>
            Find anything,
            <br />
            before you finish typing.
          </h1>
          <p className="lede">
            A keyboard launcher for Windows. Files, folders, apps and settings in one list, from an index that already knows every
            file on your drives.
          </p>
          <div className="chips" aria-label="Try a search">
            {TRY.map((t) => (
              <button key={t} className="chip-try" onClick={() => tryQuery(t)}>
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="stage" id="demo" aria-label="Interactive demo">
          <div className="stage-inner">
            <div className="demo">
              <App />
            </div>
          </div>
          <p className="stage-note">
            The real Lode interface, running on sample data in your browser. Type, use the arrow keys, press Tab. Nothing on your
            computer is searched or opened.
          </p>
        </section>

        <section className="feel" id="feel">
          <div className="split">
            <div className="split-text">
              <p className="kicker">Keyboard first</p>
              <h2>
                Keys,
                <br />
                not clicks.
              </h2>
              <p>
                One shortcut brings it up over whatever you are doing. Your hands stay on the keyboard until the thing you wanted is
                open, then it gets out of the way.
              </p>
              <a className="link-arrow" href="#demo">
                Try the keys <Arrow />
              </a>
            </div>
            <div className="panel">
              <ul className="keys">
                {KEYS.map(([keys, what]) => (
                  <li key={what}>
                    <span className="keycaps">
                      {keys.map((k) => (
                        <kbd key={k}>{k}</kbd>
                      ))}
                    </span>
                    <span>{what}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="split split-flip">
            <div className="split-text">
              <p className="kicker">Private by default</p>
              <h2>
                Nothing leaves
                <br />
                your PC.
              </h2>
              <p>
                No accounts and no telemetry. Every feature that would reach the network starts switched off, and each says plainly
                what it would send before you turn it on.
              </p>
            </div>
            <div className="panel">
              <ul className="toggles">
                {REMOTE.map(([name, note]) => (
                  <li key={name}>
                    <span>
                      <strong>{name}</strong>
                      <small>{note}</small>
                    </span>
                    <span className="toggle" role="img" aria-label="Off">
                      <i />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="band" id="inside">
          <div className="band-inner">
            <p className="kicker kicker-band">Inside</p>
            <h2>
              A new face on a fast,
              <br />
              open-source engine.
            </h2>
            <div className="flow">
              <div className="node">
                <span className="mono">shell/</span>
                <strong>React interface</strong>
                <span>In a sandboxed Electron window, with no Node and no network. It draws everything and touches nothing.</span>
              </div>
              <div className="wire">
                <span className="mono">JSON-RPC · named pipe</span>
              </div>
              <div className="node">
                <span className="mono">bridge/</span>
                <strong>wsbridge</strong>
                <span>A small C++ program with a fixed list of calls. It answers only you, in your own Windows session.</span>
              </div>
              <div className="wire">
                <span className="mono">links wscore</span>
              </div>
              <div className="node">
                <span className="mono">WinShun</span>
                <strong>Engine and index</strong>
                <span>Reads each drive’s file table and change journal, so the index is current the moment you look.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="roadmap" id="roadmap">
          <h2>
            Seven phases.
            <br />
            Nothing dropped.
          </h2>
          <ol className="phases">
            {PHASES.map(([n, title, body, state]) => (
              <li key={n} className={`phase phase-${state}`}>
                <span className="mono phase-n">{n}</span>
                <span className="phase-text">
                  <strong>{title}</strong>
                  <span>{body}</span>
                </span>
                <span className="phase-state">{state === 'now' ? 'In progress' : state === 'next' ? 'Next' : 'Planned'}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="faq" id="questions">
          <h2>Questions</h2>
          <div className="faq-list">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="closing">
          <h2>
            Press Ctrl+Space.
            <br />
            Find it. Get back to work.
          </h2>
          <div className="closing-actions">
            <a className="btn-dark" href="#demo">
              Try the demo
            </a>
            <a className="btn-light" href="#roadmap">
              See the roadmap
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <a className="brand" href="#top">
            <Mark size={20} />
            Lode
          </a>
          <span>A personal project, not a product.</span>
          <span>
            Engine by{' '}
            <a href="https://github.com/LingCore/WinShun" target="_blank" rel="noreferrer noopener">
              WinShun
            </a>{' '}
            (MIT). Type set in Geist Serif and Figtree.
          </span>
        </div>
      </footer>
    </div>
  );
}
