const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

let mainWindow;

async function startServerAndWindow() {
  let url = 'http://localhost:3000';

  if (!isDev) {
    try {
      const next = require('next');
      const nextApp = next({
        dev: false,
        dir: __dirname,
      });
      const handle = nextApp.getRequestHandler();
      await nextApp.prepare();

      const server = http.createServer((req, res) => {
        handle(req, res);
      });

      await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          const port = server.address().port;
          url = `http://127.0.0.1:${port}`;
          console.log(`Next.js production server running on ${url}`);
          resolve();
        });
      });
    } catch (err) {
      console.error('Error starting internal Next.js server:', err);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'OCR Invoice Pro - Trích xuất & Đối soát Hóa đơn GTGT',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
  });

  mainWindow.loadURL(url);

  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(startServerAndWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    startServerAndWindow();
  }
});
