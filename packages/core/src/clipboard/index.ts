import type {ClipboardProvider} from './types';

let provider: ClipboardProvider | undefined;
let pasteBuffer = '';

export function getClipboard(): ClipboardProvider {
  provider ??= createDefaultProvider();
  return provider;
}

export function setClipboard(p: ClipboardProvider): ClipboardProvider {
  const previous = provider;
  provider = p;
  return previous!;
}

export function setPasteBuffer(text: string): void {
  pasteBuffer = text;
}

function createDefaultProvider(): ClipboardProvider {
  if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
    return {
      read(): string {
        const text = pasteBuffer;
        pasteBuffer = '';
        return text;
      },
      write(text: string): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        void (navigator as unknown as {clipboard: {writeText(t: string): Promise<void>}}).clipboard.writeText(text);
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-require-imports, unicorn/prefer-module
  const mod = require('./SystemClipboard') as {SystemClipboard: new () => ClipboardProvider};
  return new mod.SystemClipboard();
}

export type {ClipboardProvider} from './types';
