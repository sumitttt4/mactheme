import type { LodeApi } from '../shared/protocol';

declare global {
  interface Window {
    lode: LodeApi;
  }
}
