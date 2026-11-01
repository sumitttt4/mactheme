// The renderer's only door to the main process: a few named calls, each
// with fixed arguments. No Node, no ipcRenderer, no generic invoke.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { EngineState, QuarryApi, Scope } from '../shared/protocol';

const api: QuarryApi = {
  search: (text: string, scope: Scope, limit: number) => ipcRenderer.invoke('quarry:search', text, scope, limit),
  open: (id: string) => ipcRenderer.invoke('quarry:open', id),
  reveal: (id: string) => ipcRenderer.invoke('quarry:reveal', id),
  engine: () => ipcRenderer.invoke('quarry:engine'),
  hide: () => ipcRenderer.send('quarry:hide'),
  resize: (height: number) => ipcRenderer.send('quarry:resize', height),
  onShown: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('quarry:shown', listener);
    return () => ipcRenderer.off('quarry:shown', listener);
  },
  onEngine: (callback: (state: EngineState) => void) => {
    const listener = (_e: IpcRendererEvent, state: EngineState) => callback(state);
    ipcRenderer.on('quarry:engine', listener);
    return () => ipcRenderer.off('quarry:engine', listener);
  },
};

contextBridge.exposeInMainWorld('quarry', api);
