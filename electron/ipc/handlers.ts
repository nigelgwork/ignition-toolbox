import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron';
import { PythonBackend } from '../services/python-backend';
import { getSetting, setSetting, getAllSettings } from '../services/settings';
import {
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getUpdateStatus,
} from '../services/auto-updater';

export function registerIpcHandlers(pythonBackend: PythonBackend): void {
  // App info handlers
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getBackendUrl', () => {
    return pythonBackend.getBaseUrl();
  });

  ipcMain.handle('app:getWebSocketUrl', () => {
    return pythonBackend.getWebSocketUrl();
  });

  ipcMain.handle('app:getBackendStatus', () => {
    return pythonBackend.getStatus();
  });

  ipcMain.handle('app:restartBackend', async () => {
    await pythonBackend.restart();
  });

  // Dialog handlers
  ipcMain.handle(
    'dialog:openFile',
    async (
      event,
      options: {
        title?: string;
        filters?: { name: string; extensions: string[] }[];
        properties?: ('openFile' | 'openDirectory' | 'multiSelections')[];
      }
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(window!, {
        title: options.title ?? 'Open File',
        filters: options.filters ?? [{ name: 'All Files', extensions: ['*'] }],
        properties: options.properties ?? ['openFile'],
      });

      if (result.canceled) {
        return null;
      }

      return result.filePaths;
    }
  );

  ipcMain.handle(
    'dialog:saveFile',
    async (
      event,
      options: {
        title?: string;
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
      }
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showSaveDialog(window!, {
        title: options.title ?? 'Save File',
        defaultPath: options.defaultPath,
        filters: options.filters ?? [{ name: 'All Files', extensions: ['*'] }],
      });

      if (result.canceled) {
        return null;
      }

      return result.filePath;
    }
  );

  // Shell handlers
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    // Validate URL for security
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        throw new Error(`Invalid protocol: ${parsed.protocol}`);
      }
      await shell.openExternal(url);
    } catch (error) {
      console.error('Failed to open external URL:', error);
      throw error;
    }
  });

  ipcMain.handle('shell:openPath', async (_, path: string) => {
    return shell.openPath(path);
  });

  // Settings handlers
  ipcMain.handle('settings:get', (_, key: string) => {
    return getSetting(key as keyof ReturnType<typeof getAllSettings>);
  });

  ipcMain.handle('settings:set', (_, key: string, value: unknown) => {
    setSetting(key as keyof ReturnType<typeof getAllSettings>, value as never);
  });

  ipcMain.handle('settings:getAll', () => {
    return getAllSettings();
  });

  // Update handlers
  ipcMain.handle('updates:check', async () => {
    return checkForUpdates();
  });

  ipcMain.handle('updates:download', async () => {
    downloadUpdate();
    return { success: true };
  });

  ipcMain.handle('updates:install', async () => {
    quitAndInstall();
    return { success: true };
  });

  ipcMain.handle('updates:getStatus', () => {
    return getUpdateStatus();
  });

  // CloudDesigner popup window
  ipcMain.handle('clouddesigner:openWindow', async () => {
    const designerWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      title: 'Ignition Designer',
      show: false, // Don't show until content is loaded
      backgroundColor: '#1a1a2e', // Dark background to prevent white flash
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Show window when content is ready
    designerWindow.once('ready-to-show', () => {
      designerWindow.show();
    });

    // Handle load failures
    designerWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error(`CloudDesigner window failed to load: ${errorCode} - ${errorDescription}`);
      designerWindow.loadURL(`data:text/html,
        <html>
          <body style="background:#1a1a2e;color:#fff;font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
            <h2>Failed to connect to CloudDesigner</h2>
            <p>Error: ${errorDescription}</p>
            <p style="color:#888;">Make sure the Docker container is running on port 8080</p>
          </body>
        </html>
      `);
    });

    designerWindow.loadURL('http://localhost:8080');
    return true;
  });

  console.log('IPC handlers registered');
}
