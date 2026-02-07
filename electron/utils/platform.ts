import { execFile } from 'child_process';
import * as fs from 'fs';
import { shell } from 'electron';

/**
 * Check if running in WSL2
 */
export function isWSL(): boolean {
  if (process.platform !== 'linux') return false;
  try {
    const release = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
    return release.includes('microsoft') || release.includes('wsl');
  } catch {
    return false;
  }
}

/**
 * Open URL in default browser, handling WSL2 environments
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isWSL()) {
    // In WSL2, use cmd.exe to open URLs in Windows default browser
    return new Promise((resolve, reject) => {
      execFile('cmd.exe', ['/c', 'start', '', url], (error) => {
        if (error) {
          console.error('Failed to open URL via cmd.exe:', error);
          // Fallback to wslview if available
          execFile('wslview', [url], (err2) => {
            if (err2) {
              reject(err2);
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  } else {
    // Standard Electron shell.openExternal for non-WSL environments
    return shell.openExternal(url);
  }
}
