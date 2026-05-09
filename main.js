const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const chokidar = require('chokidar');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  const skinPath = path.join(__dirname, 'skins', 'skin.png');

  const watcher = chokidar.watch(skinPath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50
    },
  });

  watcher.on('change', () => {
    if (mainWindow) {
      mainWindow.webContents.send('skin-updated');
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
