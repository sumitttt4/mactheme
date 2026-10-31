// The renderer's only door to the main process: a few named calls, each
// with fixed arguments. No Node, no ipcRenderer, no generic invoke.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { EngineState, LodeApi, Scope } from '../shared/protocol';

const api: LodeApi = {
  search: (text: string, scope: Scope, limit: number) => ipcRenderer.invoke('lode:search', text, scope, limit),
  open: (id: string) => ipcRenderer.invoke('lode:open', id),
  reveal: (id: string) => ipcRenderer.invoke('lode:reveal', id),
  engine: () => ipcRenderer.invoke('lode:engine'),
  hide: () => ipcRenderer.send('lode:hide'),
  resize: (height: number) => ipcRenderer.send('lode:resize', height),
  onShown: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('lode:shown', listener);
    return () => ipcRenderer.off('lode:shown', listener);
  },
  onEngine: (callback: (state: EngineState) => void) => {
    const listener = (_e: IpcRendererEvent, state: EngineState) => callback(state);
    ipcRenderer.on('lode:engine', listener);
    return () => ipcRenderer.off('lode:engine', listener);
  },
};

contextBridge.exposeInMainWorld('lode', api);
