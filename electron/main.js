const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1410',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../assest/logo.ico'),
  });

  // Sayfa yükleme hatalarını terminale yaz
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page load failed:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (isDev) return; // dev modda DevTools zaten gösteriyor, performans için atla
    const prefix = ['LOG', 'WARN', 'ERROR'][level] || 'LOG';
    console.log(`[RENDERER ${prefix}] ${message}`);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // F12 ile DevTools aç/kapa (otomatik açılmıyor - performans için)
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' && input.type === 'keyDown') {
        mainWindow.webContents.toggleDevTools();
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Auto-updater (only in production)
  if (!isDev) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      sendUpdateStatus('checking');
    });
    autoUpdater.on('update-available', (info) => {
      sendUpdateStatus('available', info);
    });
    autoUpdater.on('update-not-available', () => {
      sendUpdateStatus('not-available');
    });
    autoUpdater.on('download-progress', (progress) => {
      sendUpdateStatus('downloading', { percent: Math.round(progress.percent) });
    });
    autoUpdater.on('update-downloaded', (info) => {
      sendUpdateStatus('downloaded', info);
    });
    autoUpdater.on('error', (err) => {
      sendUpdateStatus('error', { message: err?.message || 'Bilinmeyen hata' });
    });

    // Check for updates after a short delay
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 5000);
  }
});

function sendUpdateStatus(status, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, ...data });
  }
}

// Manual update check from renderer
ipcMain.on('check-for-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdates().catch(() => {});
  }
});

// Install update now
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// List music files from assest/music
ipcMain.handle('list-music-files', async () => {
  try {
    const musicDir = isDev
      ? path.join(__dirname, '../public/assest/music')
      : path.join(app.getAppPath(), 'assest/music');
    const allFiles = fs.readdirSync(musicDir);
    const musicFiles = allFiles
      .filter(f => /\.(mp3|m4a|ogg|wav)$/i.test(f))
      .filter(f => !f.match(/\(\d+\)\.\w+$/));
    return musicFiles.map(f => ({
      file: encodeURI('./assest/music/' + f),
      name: f.replace(/\.(mp3|m4a|ogg|wav)$/i, ''),
    }));
  } catch (err) {
    console.error('Failed to list music files:', err);
    return [];
  }
});

// Window control IPC handlers
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.on('window:fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// Open external URL in default browser
ipcMain.on('open-external', (event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});
