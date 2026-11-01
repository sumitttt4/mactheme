import { useEffect } from 'react';
import { App } from '../App';
import './landing.css';

const REPO = 'https://github.com/sumitttt4/mactheme';
const DOWNLOAD = `${REPO}/releases/latest`;
const TRY = ['resume', 'screenshots', 'visual studio', 'display', 'projects', 'budget'];

const SECTIONS: [string, string][] = [
  ['demo', 'Demo'],
  ['feel', 'How it feels'],
  ['inside', 'Inside'],
  ['download', 'Download'],
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
    'Is it free?',
    'Yes. Quarry is open source under the MIT license: use it, change it, share it. The search engine it builds on, WinShun, is MIT too.',
  ],
  [
    'What do I need?',
    'Windows 10 or 11, 64-bit. Download the zip, unzip it anywhere and run Quarry.exe. No installer, no account, and nothing else to install: the engine comes compiled inside.',
  ],
  [
    'Why is there an optional service?',
    'Reading a drive’s file table directly needs administrator rights. WinShun’s small index service does that, installed once with one consent, and makes results instant. Without it Quarry still works, with your normal rights, by walking your drives (slower the first time).',
  ],
  [
    'Does it send anything online?',
    'No. Nothing leaves the PC by default: no accounts, no telemetry. Each remote feature has its own switch, off until you turn it on, with a note on what it sends.',
  ],
  [
    'Does it work on macOS or Linux?',
    'No. It searches Windows drives by reading their NTFS file tables, and opens things the way Windows does.',
  ],
  [
    'How can I help?',
    'Try it, open an issue when something is off, or send a pull request. The roadmap above is the plan; the README explains how the pieces fit.',
  ],
];

function tryQuery(text: string) {
  window.dispatchEvent(new CustomEvent('quarry:try', { detail: text }));
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

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" />
    </svg>
  );
}

function WindowsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M1 2.6 6.7 1.8v5.5H1ZM7.4 1.7 15 .6v6.7H7.4ZM1 8h5.7v5.5L1 12.7ZM7.4 8H15v6.8l-7.6-1.1Z" />
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
            Quarry
          </a>
          <nav className="nav-links" aria-label="Sections">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <a className="nav-github" href={REPO} target="_blank" rel="noreferrer noopener" aria-label="Quarry on GitHub">
              <GitHubIcon size={18} />
            </a>
            <a className="btn-dark" href="#download">
              <DownloadIcon />
              Download
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <a className="badge-line" href={REPO} target="_blank" rel="noreferrer noopener">
            <span className="badge-new">Open source</span>
            MIT licensed · Windows 10 and 11
            <Arrow />
          </a>
          <h1>
            Find anything,
            <br />
            before you finish typing.
          </h1>
          <p className="lede">
            A keyboard launcher for Windows. Files, folders, apps and settings in one list, from an index that already knows every
            file on your drives.
          </p>
          <div className="hero-actions">
            <a className="btn-dark btn-lg" href={DOWNLOAD}>
              <WindowsIcon />
              Download for Windows
            </a>
            <a className="btn-light btn-lg" href={REPO} target="_blank" rel="noreferrer noopener">
              <GitHubIcon />
              View on GitHub
            </a>
          </div>
          <p className="hero-meta">Free and open source · x64 · no installer, no account</p>
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
            The real Quarry interface, running on sample data in your browser. Type, use the arrow keys, press Tab. The app searches
            your own drives.
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

        <section className="download" id="download">
          <div className="download-card">
            <div className="download-main">
              <p className="kicker">Download</p>
              <h2>
                Get Quarry
                <br />
                for Windows.
              </h2>
              <p className="download-lede">Free and open source under the MIT license. Windows 10 and 11, 64-bit.</p>
              <div className="download-actions">
                <a className="btn-gold btn-lg" href={DOWNLOAD}>
                  <DownloadIcon />
                  Download the latest release
                </a>
                <a className="btn-light btn-lg" href={`${REPO}/releases`} target="_blank" rel="noreferrer noopener">
                  All releases
                </a>
              </div>
            </div>
            <ol className="steps">
              <li>
                <span className="step-n">1</span>
                <span>
                  <strong>Unzip and run</strong>
                  Unzip <code>Quarry-…-windows-x64.zip</code> anywhere and open <code>Quarry.exe</code>. It lives in the tray.
                </span>
              </li>
              <li>
                <span className="step-n">2</span>
                <span>
                  <strong>Press Ctrl+Space</strong>
                  From any app. Type, then Enter to open, or Ctrl+Enter to show the file in its folder.
                </span>
              </li>
              <li>
                <span className="step-n">3</span>
                <span>
                  <strong>Optional: instant index</strong>
                  Install{' '}
                  <a href="https://github.com/LingCore/WinShun" target="_blank" rel="noreferrer noopener">
                    WinShun
                  </a>
                  ’s index service once (one admin consent) and results come straight from your drives’ file tables.
                </span>
              </li>
            </ol>
          </div>

          <div className="source">
            <div>
              <p className="kicker">For developers</p>
              <p className="source-lede">
                You don’t need any of this to use Quarry: the download comes ready to run. To build it yourself, everything is on
                GitHub: the React interface, the small C++ bridge to the search engine, and the scripts. Issues and pull requests
                are welcome.
              </p>
              <a className="link-arrow" href={REPO} target="_blank" rel="noreferrer noopener">
                <GitHubIcon /> sumitttt4/mactheme <Arrow />
              </a>
            </div>
            <pre className="code" aria-label="Build from source">
              <code>
                <span className="c"># Windows · PowerShell · VS 2022 + Qt 6.8 + Node 22</span>
                {'\n'}git clone {REPO}.git quarry
                {'\n'}cd quarry
                {'\n'}./scripts/setup-upstream.ps1
                {'\n'}./scripts/build-bridge.ps1
                {'\n'}cd shell; npm install; npm start
              </code>
            </pre>
          </div>
        </section>

        <section className="roadmap" id="roadmap">
          <div>
            <h2>
              Where it’s
              <br />
              going.
            </h2>
            <p className="roadmap-note">
              Seven phases to match everything WinShun does, in a new interface. Follow along or pitch in on{' '}
              <a href={REPO} target="_blank" rel="noreferrer noopener">
                GitHub
              </a>
              .
            </p>
          </div>
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
            <a className="btn-dark btn-lg" href={DOWNLOAD}>
              <WindowsIcon />
              Download for Windows
            </a>
            <a className="btn-light btn-lg" href={REPO} target="_blank" rel="noreferrer noopener">
              <GitHubIcon />
              Star on GitHub
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <a className="brand" href="#top">
              <Mark size={20} />
              Quarry
            </a>
            <p>A fast, private launcher for Windows. Open source under the MIT license.</p>
          </div>
          <nav className="footer-cols" aria-label="Footer">
            <div>
              <h4>Product</h4>
              <a href="#demo">Demo</a>
              <a href="#download">Download</a>
              <a href="#roadmap">Roadmap</a>
              <a href="#questions">Questions</a>
            </div>
            <div>
              <h4>Open source</h4>
              <a href={REPO} target="_blank" rel="noreferrer noopener">GitHub</a>
              <a href={`${REPO}/releases`} target="_blank" rel="noreferrer noopener">Releases</a>
              <a href={`${REPO}/issues`} target="_blank" rel="noreferrer noopener">Issues</a>
              <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer noopener">MIT license</a>
            </div>
            <div>
              <h4>Built on</h4>
              <a href="https://github.com/LingCore/WinShun" target="_blank" rel="noreferrer noopener">WinShun (MIT)</a>
              <a href="https://www.electronjs.org/" target="_blank" rel="noreferrer noopener">Electron</a>
              <a href="https://react.dev/" target="_blank" rel="noreferrer noopener">React</a>
            </div>
          </nav>
        </div>
        <div className="footer-base">
          <span>© 2026 Quarry contributors</span>
          <span>Type set in Geist Serif and Figtree</span>
        </div>
      </footer>
    </div>
  );
}
