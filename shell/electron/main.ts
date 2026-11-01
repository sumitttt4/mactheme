// The shell's main process: owns the window, the hotkey, the tray and the
// engine (the bridge, or the mock). The renderer only draws; every request
// it makes comes through the handlers below, checked.

import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, nativeTheme, screen, Tray } from 'electron';
import { join } from 'node:path';
import { identity } from '../shared/identity';
import type { EngineState } from '../shared/protocol';
import { BridgeEngine } from './bridgeEngine';
import type { Engine } from './engine';
import * as launch from './launch';
import { lockDown } from './lockdown';
import { MockEngine } from './mockEngine';
import * as validate from './validate';

const WIDTH = 820;
const HOTKEYS = ['Control+Space', 'Control+Alt+Space']; // the first that Windows lets us have
const devUrl = process.env.QUARRY_DEV_URL;
const useMock = process.argv.includes('--mock') || process.env.QUARRY_MOCK === '1' || process.platform !== 'win32';

app.setName(identity.name);
app.setAppUserModelId(`local.${identity.id}.launcher`);
if (!app.requestSingleInstanceLock()) app.exit(0);

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let engine: Engine;
let hotkey: string | null = null;
let quitting = false;

function bridgeExe(): string {
  if (process.env.QUARRY_BRIDGE_EXE) return process.env.QUARRY_BRIDGE_EXE;
  if (app.isPackaged) return join(process.resourcesPath, 'bridge', 'wsbridge.exe');
  return join(__dirname, '..', '..', 'bridge-bin', 'wsbridge.exe');
}

function createWindow(): BrowserWindow {
  const w = new BrowserWindow({
    width: WIDTH,
    height: 64,
    useContentSize: true,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#16131f' : '#f4f2f9',
    title: identity.name,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      webSecurity: true,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });
  w.setMenu(null);
  if (devUrl) void w.loadURL(devUrl);
  else void w.loadFile(join(__dirname, '..', '..', 'dist', 'index.html'));
  w.on('blur', () => {
    if (!w.webContents.isDevToolsOpened()) w.hide();
  });
  w.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      w.hide();
    }
  });
  return w;
}

function show(): void {
  if (!win) return;
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const area = display.workArea;
  const [, height] = win.getContentSize();
  win.setBounds({
    x: Math.round(area.x + (area.width - WIDTH) / 2),
    y: Math.round(area.y + area.height * 0.2),
    width: WIDTH,
    height,
  });
  win.show();
  win.focus();
  win.webContents.send('quarry:shown');
}

function toggle(): void {
  if (win?.isVisible() && win.isFocused()) win.hide();
  else show();
}

function registerHotkey(): void {
  for (const key of HOTKEYS) {
    if (globalShortcut.register(key, toggle)) {
      hotkey = key;
      return;
    }
    console.warn(`[quarry] ${key} is taken by another program`);
  }
}

function engineChanged(state: EngineState): void {
  win?.webContents.send('quarry:engine', state);
  if (tray) tray.setToolTip(trayTip(state));
}

function trayTip(state: EngineState): string {
  const keys = hotkey ? hotkey.replace('Control', 'Ctrl') : 'no hotkey';
  if (!state.up) return `${identity.name} (${keys}): ${state.reason}`;
  return `${identity.name} (${keys}): index ${state.index.state}, ${state.index.items.toLocaleString('en-US')} items`;
}

function createTray(): Tray {
  const icon = nativeImage.createFromPath(join(app.getAppPath(), 'build', 'tray.png'));
  const t = new Tray(icon);
  t.setToolTip(trayTip(engine.state()));
  t.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Show ${identity.name}`, click: show },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  );
  t.on('click', show);
  return t;
}

function handleIpc(): void {
  const fromOurWindow = (e: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) =>
    win !== null && e.sender === win.webContents && e.senderFrame === win.webContents.mainFrame;

  ipcMain.handle('quarry:search', async (e, text: unknown, scope: unknown, limit: unknown) => {
    if (!fromOurWindow(e)) return { error: 'refused' };
    const t = validate.queryText(text);
    const s = validate.scope(scope);
    const l = validate.limit(limit);
    if (t === null || s === null || l === null) return { error: 'bad request' };
    try {
      return await engine.search(t, s, l);
    } catch (error) {
      return { error: (error as Error).message };
    }
  });

  const act = (how: 'open' | 'reveal') => async (e: Electron.IpcMainInvokeEvent, id: unknown) => {
    if (!fromOurWindow(e)) return { ok: false, error: 'refused' };
    const h = validate.handle(id);
    if (h === null) return { ok: false, error: 'bad request' };
    try {
      const plan = await engine.resolve(h);
      const result = how === 'open' ? await launch.open(plan) : launch.reveal(plan);
      if (result.ok) win?.hide();
      return result;
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  };
  ipcMain.handle('quarry:open', act('open'));
  ipcMain.handle('quarry:reveal', act('reveal'));
  ipcMain.handle('quarry:engine', (e) => (fromOurWindow(e) ? engine.state() : null));

  ipcMain.on('quarry:hide', (e) => {
    if (fromOurWindow(e)) win?.hide();
  });
  ipcMain.on('quarry:resize', (e, height: unknown) => {
    const h = validate.windowHeight(height);
    if (!fromOurWindow(e) || h === null || !win) return;
    const [w, current] = win.getContentSize();
    if (current !== h) win.setContentSize(w, h);
  });
}

app.on('second-instance', show);

app.whenReady().then(async () => {
  lockDown(devUrl);
  engine = useMock
    ? new MockEngine()
    : new BridgeEngine({ exe: bridgeExe(), logFile: join(app.getPath('userData'), 'logs', 'bridge.log') });
  engine.on('state', engineChanged);
  handleIpc();
  win = createWindow();
  registerHotkey();
  tray = createTray();
  // No hotkey to be had, or a development run: show the window so it can be found.
  if (!hotkey || !app.isPackaged || process.argv.includes('--show')) win.once('ready-to-show', show);
  await engine.start();
});

app.on('before-quit', () => {
  quitting = true;
  globalShortcut.unregisterAll();
  engine?.stop();
});

app.on('window-all-closed', () => {
  // Stays in the tray.
});
