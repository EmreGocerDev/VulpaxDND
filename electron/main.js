const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

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
    const prefix = ['LOG', 'WARN', 'ERROR'][level] || 'LOG';
    console.log(`[RENDERER ${prefix}] ${message}`);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // F12 ile DevTools aç/kapa
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' && input.type === 'keyDown') {
        mainWindow.webContents.toggleDevTools();
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

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
