const { app, BrowserWindow } = require('electron');
const path = require('path');

// IMPORTANT: This line fixes the 'Invalid mailbox' / 'SharedImageManager' black screen issues on macOS
// It forces software rendering which is slightly slower but reliable.
app.disableHardwareAcceleration();

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            devTools: true,
            backgroundThrottling: false
        },
        titleBarStyle: 'hiddenInset', 
        backgroundColor: '#09090b',
        show: false
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
    
    setTimeout(() => {
        if (!win.isVisible()) win.show();
    }, 1000);
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
