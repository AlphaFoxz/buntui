import {SystemClipboard} from './SystemClipboard';
import type {ClipboardProvider} from './types';

let provider: ClipboardProvider = new SystemClipboard();

export function getClipboard(): ClipboardProvider {
  return provider;
}

export function setClipboard(p: ClipboardProvider): ClipboardProvider {
  const previous = provider;
  provider = p;
  return previous;
}

export {SystemClipboard} from './SystemClipboard';
export type {ClipboardProvider} from './types';
