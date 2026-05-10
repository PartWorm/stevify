const { app, dialog, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const chokidar = require('chokidar');
const { default: electron_dl, CancelError, download  } = require('electron-dl');
const { unusedFilenameSync } = require('unused-filename');

electron_dl();

let main_window;

function notify_update(patharg) {
    if (main_window) {
        main_window.webContents.send('skin-updated', { name: path.basename(patharg), path: patharg });
    }
}

let skin_path = undefined;

let watcher =
    chokidar.watch([], {
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 200,
            pollInterval: 50
        },
    });
watcher.on('change', notify_update);

function create_window() {
    main_window =
        new BrowserWindow({
            width: 800,
            height: 800,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
            alwaysOnTop: true,
            useContentSize: true,
        });

    main_window.loadFile('index.html');

    main_window.setAspectRatio(1);
}

app.whenReady().then(create_window);

app.on('window-all-closed', () => {
    app.quit();
});

ipcMain.handle('select-skin', async () => {
    let result =
        await dialog.showOpenDialog({
            properties: ['openFile'],
        });
    if (result.canceled) {
        return null;
    }
    if (skin_path) {
        watcher.unwatch(skin_path);
    }
    skin_path = result.filePaths[0];
    watcher.add(skin_path);
    notify_update(skin_path);
});

ipcMain.handle('set-always-on-top', (_, enabled) => {
    let win = BrowserWindow.getFocusedWindow();
    if (!win) {
        return false;
    }
    win.setAlwaysOnTop(enabled);
    return win.isAlwaysOnTop();
})

ipcMain.handle('download', async (_, url) => {
	let win = BrowserWindow.getFocusedWindow();
    if (!skin_path) {
        return;
    }
	try {
        let dir = app.getPath('downloads');
        let name = path.basename(unusedFilenameSync(path.join(dir, path.basename(skin_path))));
		console.log(await download(win, url, { directory: dir, filename: name }));
	}
    catch (e) {
		if (e instanceof CancelError) {
			console.info('item.cancel() was called');
		}
        else {
			console.error(e);
		}
	}
});
