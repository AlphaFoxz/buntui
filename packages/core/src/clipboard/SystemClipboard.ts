import process from 'node:process';
import {spawnSync} from 'node:child_process';
import type {ClipboardProvider} from './types';

export class SystemClipboard implements ClipboardProvider {
  read(): string {
    try {
      const {platform} = process;
      if (platform === 'win32') {
        const result = spawnSync('powershell', ['-command', 'Get-Clipboard'], {
          encoding: 'utf8',
          timeout: 3000,
          windowsHide: true,
        });
        if (result.status === 0 && result.stdout) {
          return result.stdout.replace(/\r?\n$/v, '');
        }
      } else if (platform === 'darwin') {
        const result = spawnSync('pbpaste', {encoding: 'utf8', timeout: 3000});
        if (result.status === 0 && result.stdout) {
          return result.stdout;
        }
      } else {
        const result = spawnSync('xclip', ['-selection', 'clipboard', '-o'], {
          encoding: 'utf8',
          timeout: 3000,
        });
        if (result.status === 0 && result.stdout) {
          return result.stdout;
        }
      }
    } catch {
      // Clipboard not available
    }

    return '';
  }

  write(text: string): void {
    try {
      const {platform} = process;
      if (platform === 'win32') {
        spawnSync('clip', {input: text, timeout: 3000, windowsHide: true});
      } else if (platform === 'darwin') {
        spawnSync('pbcopy', {input: text, timeout: 3000});
      } else {
        spawnSync('xclip', ['-selection', 'clipboard'], {
          input: text,
          timeout: 3000,
        });
      }
    } catch {
      // Clipboard not available
    }
  }
}
