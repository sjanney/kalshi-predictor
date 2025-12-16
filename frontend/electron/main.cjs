const { app, BrowserWindow } = require('electron');
const path = require('path');

// Disable hardware acceleration to prevent rendering issues
// app.disableHardwareAcceleration();

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false, // Security: Disable Node.js integration in renderer
            contextIsolation: true, // Security: Enable context isolation
            webSecurity: true, // Security: Enable web security
            devTools: process.env.NODE_ENV === 'development',
            backgroundThrottling: false,
            spellcheck: false,
        },
        titleBarStyle: 'hiddenInset', 
        backgroundColor: '#09090b',
        show: false,
        frame: true,
        transparent: false,
    });

    const isDev = process.env.NODE_ENV === 'development';
    console.log('Electron starting in mode:', isDev ? 'development' : 'production');

    if (isDev) {
        win.loadURL('http://localhost:5173')
            .then(() => {
                console.log('Successfully loaded URL');
            })
            .catch(e => {
                console.error('Failed to load local dev server:', e);
            });
            
        win.webContents.openDevTools({ mode: 'bottom' });
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html');
        console.log('Loading production build from:', indexPath);
        win.loadFile(indexPath);
    }
    
    win.once('ready-to-show', () => {
        win.show();
    });
    
    // Open external links in default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'allow' };
    });
}

// Fix for the autofill/devtools errors
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication');

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
