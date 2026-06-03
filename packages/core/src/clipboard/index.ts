import type {ClipboardProvider} from './types';

let provider: ClipboardProvider | undefined;

export function getClipboard(): ClipboardProvider {
  provider ??= createDefaultProvider();
  return provider;
}

export function setClipboard(p: ClipboardProvider): ClipboardProvider {
  const previous = provider;
  provider = p;
  return previous!;
}

function createDefaultProvider(): ClipboardProvider {
  if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
    return {
      read(): string {
        return '';
      },
      write(text: string): void {
        void (navigator as unknown as {clipboard: {writeText(t: string): Promise<void>}}).clipboard.writeText(text);
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
  const mod = require('./SystemClipboard') as {SystemClipboard: new () => ClipboardProvider};
  return new mod.SystemClipboard();
}

export type {ClipboardProvider} from './types';
