import type { QuarryApi } from '../shared/protocol';

declare global {
  interface Window {
    quarry: QuarryApi;
  }
}
