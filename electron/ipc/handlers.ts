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
    const targetUrl = 'http://localhost:8080';
    console.log(`CloudDesigner: Opening window for ${targetUrl}`);

    const designerWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      title: `Ignition Designer - Loading ${targetUrl}`,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        allowRunningInsecureContent: true,
      },
    });

    // Open DevTools docked to bottom for debugging
    designerWindow.webContents.openDevTools({ mode: 'bottom' });

    // Comprehensive event logging
    designerWindow.webContents.on('did-start-loading', () => {
      console.log('CloudDesigner: did-start-loading');
      designerWindow.setTitle(`Ignition Designer - Loading...`);
    });

    designerWindow.webContents.on('did-stop-loading', () => {
      console.log('CloudDesigner: did-stop-loading');
    });

    designerWindow.webContents.on('did-finish-load', () => {
      const url = designerWindow.webContents.getURL();
      console.log(`CloudDesigner: did-finish-load - URL: ${url}`);
      designerWindow.setTitle(`Ignition Designer - ${url}`);
    });

    designerWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error(`CloudDesigner: did-fail-load - Code: ${errorCode}, Desc: ${errorDescription}, URL: ${validatedURL}`);
      designerWindow.setTitle(`Ignition Designer - FAILED`);

      // Show error page
      designerWindow.loadURL(`data:text/html;charset=utf-8,
        <!DOCTYPE html>
        <html>
        <head><title>CloudDesigner Error</title></head>
        <body style="background:#1a1a2e;color:#fff;font-family:system-ui;padding:40px;">
          <h1 style="color:#ff6b6b;">Failed to Load CloudDesigner</h1>
          <div style="background:#2a2a4e;padding:20px;border-radius:8px;margin:20px 0;">
            <p><strong>URL:</strong> ${validatedURL}</p>
            <p><strong>Error Code:</strong> ${errorCode}</p>
            <p><strong>Description:</strong> ${errorDescription}</p>
          </div>
          <h2>Troubleshooting:</h2>
          <ol style="line-height:2;">
            <li>Make sure the Docker container is running</li>
            <li>Check if port 8080 is accessible: <code>curl http://localhost:8080</code></li>
            <li>Check Docker logs: <code>docker logs clouddesigner-nginx</code></li>
          </ol>
        </body>
        </html>
      `);
    });

    designerWindow.webContents.on('dom-ready', () => {
      console.log('CloudDesigner: dom-ready');
    });

    designerWindow.webContents.on('did-navigate', (_event, url) => {
      console.log(`CloudDesigner: did-navigate to ${url}`);
    });

    designerWindow.webContents.on('did-navigate-in-page', (_event, url) => {
      console.log(`CloudDesigner: did-navigate-in-page to ${url}`);
    });

    designerWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error(`CloudDesigner: render-process-gone - reason: ${details.reason}`);
    });

    designerWindow.webContents.on('unresponsive', () => {
      console.warn('CloudDesigner: window became unresponsive');
    });

    designerWindow.webContents.on('responsive', () => {
      console.log('CloudDesigner: window became responsive again');
    });

    // Log console messages from the loaded page
    designerWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      const levelStr = ['verbose', 'info', 'warning', 'error'][level] || 'unknown';
      console.log(`CloudDesigner console [${levelStr}]: ${message} (${sourceId}:${line})`);
    });

    // Handle certificate errors
    designerWindow.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
      console.warn(`CloudDesigner: certificate-error for ${url}: ${error}`);
      // Allow localhost certificates
      if (url.includes('localhost')) {
        event.preventDefault();
        callback(true);
      } else {
        callback(false);
      }
    });

    console.log(`CloudDesigner: Calling loadURL(${targetUrl})`);
    designerWindow.loadURL(targetUrl);
    console.log('CloudDesigner: loadURL called');

    return true;
  });

  console.log('IPC handlers registered');
}
