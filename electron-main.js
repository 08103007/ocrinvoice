const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

let mainWindow = null;
let serverProcess = null;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function waitForServer(url, timeoutMs = 30000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const testConnection = () => {
      const req = http.get(url, (res) => {
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Quá thời gian chờ khởi động máy chủ nội bộ.'));
        } else {
          setTimeout(testConnection, 200);
        }
      });

      req.setTimeout(1000, () => {
        req.destroy();
        setTimeout(testConnection, 200);
      });
    };
    testConnection();
  });
}

async function startServer() {
  if (isDev) {
    return 'http://localhost:3000';
  }

  const port = await getFreePort();

  const standaloneDir = app.isPackaged
    ? path.join(process.resourcesPath, 'standalone')
    : path.join(__dirname, '.next', 'standalone');

  const serverScript = path.join(standaloneDir, 'server.js');

  if (!fs.existsSync(serverScript)) {
    throw new Error(`Không tìm thấy file máy chủ tại: ${serverScript}`);
  }

  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    ELECTRON_RUN_AS_NODE: '1',
  };

  serverProcess = fork(serverScript, [], {
    cwd: standaloneDir,
    env,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    execPath: process.execPath,
  });

  let serverErrorLog = '';

  serverProcess.stdout?.on('data', (data) => {
    console.log(`[Next.js Server]: ${data}`);
  });

  serverProcess.stderr?.on('data', (data) => {
    const str = String(data);
    serverErrorLog += str;
    console.error(`[Next.js Server Error]: ${str}`);
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Server process exited with code ${code}. Errors: ${serverErrorLog}`);
    }
  });

  const appUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(appUrl);
  } catch (err) {
    if (serverErrorLog) {
      throw new Error(`${err.message}\nChi tiết lỗi: ${serverErrorLog.substring(0, 300)}`);
    }
    throw err;
  }

  return appUrl;
}

async function createWindow() {
  let url = 'http://localhost:3000';
  try {
    url = await startServer();
  } catch (err) {
    dialog.showErrorBox(
      'Lỗi Khởi Động',
      'Không thể khởi động hệ thống ứng dụng:\n' + (err.message || err)
    );
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'OCR Invoice Pro - Hóa Đơn GTGT',
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

app.whenReady().then(createWindow);

function stopServerProcess() {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {
      console.error('Error stopping server process:', e);
    }
    serverProcess = null;
  }
}

app.on('window-all-closed', () => {
  stopServerProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', stopServerProcess);
app.on('quit', stopServerProcess);
