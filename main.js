const { app, BrowserWindow, ipcMain, screen, shell, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

// Hardware GPU Acceleration for silky smooth 60-120fps animations
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// Ultra-Low RAM Consumption Tuning
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=64 --expose-gc');
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-features', 'SpareRendererForSitePerProcess,CalculateNativeWinOcclusion');

let mainWindow;
let noteWindow = null;

// Hardware Telemetry Helper
function getCpuAverage() {
    const cpus = os.cpus();
    if (!cpus || cpus.length === 0) return { idle: 0, total: 0 };
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) {
            total += cpu.times[type];
        }
        idle += cpu.times.idle;
    }
    return { idle: idle / cpus.length, total: total / cpus.length };
}

let startCpu = getCpuAverage();

function getCpuUsage() {
    const endCpu = getCpuAverage();
    const idleDelta = endCpu.idle - startCpu.idle;
    const totalDelta = endCpu.total - startCpu.total;
    startCpu = endCpu;
    if (totalDelta <= 0) return 0;
    const percentage = 100 - Math.round((100 * idleDelta) / totalDelta);
    return Math.max(0, Math.min(100, percentage));
}

function getWindowBounds(stateName, customHeight) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea; // Excludes Taskbar!

    if (stateName === 'panel') {
        const height = Math.min(620, workArea.height - 40);
        return {
            x: 0,
            y: Math.floor(workArea.y + (workArea.height - height) / 2),
            width: 500,
            height: height
        };
    }

    if (stateName === 'power') {
        // Pertahankan tinggi yang persis sama dengan dock bar (tidak mengecil/meloncat)
        const height = customHeight ? Math.min(customHeight, workArea.height - 30) : 500;
        return {
            x: 0,
            y: Math.floor(workArea.y + (workArea.height - height) / 2),
            width: 320,
            height: height
        };
    }

    if (stateName === 'dock') {
        // Auto-scale height dinamis sesuai jumlah aplikasi yang dipin
        const height = customHeight ? Math.min(customHeight, workArea.height - 30) : 500;
        return {
            x: 0,
            y: Math.floor(workArea.y + (workArea.height - height) / 2),
            width: 88,
            height: height
        };
    }

    // Mode Idle: Zero-Hitbox (hanya sebesar pill indikator tepi, tidak ada kotak transparan yang menghalangi game)
    const idleHeight = 70;
    return {
        x: 0,
        y: Math.floor(workArea.y + (workArea.height - idleHeight) / 2),
        width: 16,
        height: idleHeight
    };
}

function getStoredConfig() {
    try {
        const cfgPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(cfgPath)) {
            return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function createWindow() {
    const initialBounds = getWindowBounds('idle');

    mainWindow = new BrowserWindow({
        x: initialBounds.x,
        y: initialBounds.y,
        width: initialBounds.width,
        height: initialBounds.height,
        transparent: true,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    try {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } catch(e) {}

    mainWindow.on('close', () => {
        try { fs.appendFileSync(path.join(__dirname, 'crash.log'), `mainWindow closed at ${new Date().toISOString()}\n`); } catch(e) {}
    });

    process.on('uncaughtException', (err) => {
        try { fs.appendFileSync(path.join(__dirname, 'crash.log'), `UNCAUGHT: ${err.stack}\n`); } catch(e) {}
    });

    // Tutup sidebar otomatis saat pengguna klik di luar sidebar atau tekan tombol Win (blur)
    mainWindow.on('blur', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('window-blur');
        }
    });

    // Config handlers
    ipcMain.handle('get-config', () => getStoredConfig());
    ipcMain.handle('save-config', (event, cfg) => {
        try {
            const cfgPath = path.join(__dirname, 'config.json');
            fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
            return true;
        } catch(e) { return false; }
    });

    // Hardware Telemetry (CPU & RAM) handler
    ipcMain.handle('get-system-stats', () => {
        try {
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const ramPercent = Math.round((usedMem / totalMem) * 100);
            const cpuPercent = getCpuUsage();

            return {
                cpuPercent,
                ramPercent,
                ramUsedGB: (usedMem / (1024 * 1024 * 1024)).toFixed(1),
                ramTotalGB: Math.round(totalMem / (1024 * 1024 * 1024))
            };
        } catch (e) {
            return { cpuPercent: 0, ramPercent: 0, ramUsedGB: "0", ramTotalGB: 0 };
        }
    });

    // Handle state transitions with Idle RAM Optimization & Zero-Hitbox Mouse Passthrough
    let idleGcTimeout = null;
    ipcMain.on('set-state', (event, stateName, options) => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const customHeight = options && options.height ? options.height : null;
        const b = getWindowBounds(stateName, customHeight);
        mainWindow.setBounds(b);

        if (stateName === 'idle') {
            try {
                mainWindow.setIgnoreMouseEvents(true, { forward: true });
            } catch (e) {}
            clearTimeout(idleGcTimeout);
            idleGcTimeout = setTimeout(() => {
                if (global.gc) try { global.gc(); } catch(e) {}
                if (process.trimWorkingSet) try { process.trimWorkingSet(); } catch(e) {}
            }, 1200);
        } else {
            try {
                mainWindow.setIgnoreMouseEvents(false);
            } catch (e) {}
            clearTimeout(idleGcTimeout);
        }
    });

    ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.setIgnoreMouseEvents(ignore, options || {});
            } catch (e) {}
        }
    });

    // Native Explorer File Picker Dialog for adding apps!
    ipcMain.handle('select-app-file', async () => {
        const startMenuDir = path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft\\Windows\\Start Menu\\Programs');
        const defaultPath = fs.existsSync(startMenuDir) ? startMenuDir : 'C:\\';

        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Pilih Aplikasi untuk Ditambahkan ke Sidebar',
            defaultPath: defaultPath,
            properties: ['openFile'],
            filters: [
                { name: 'Aplikasi & Shortcut (*.lnk, *.exe, *.url)', extensions: ['lnk', 'exe', 'url'] },
                { name: 'Semua File (*.*)', extensions: ['*'] }
            ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const fileName = path.basename(filePath, path.extname(filePath));
            return {
                name: fileName,
                path: filePath
            };
        }
        return null;
    });

    // Launch Real Windows Application with ZERO terminal/cmd window popup!
    ipcMain.handle('launch-app', async (event, target) => {
        if (!target) return false;
        
        if (target.startsWith('http') || target.includes('://') || target.startsWith('ms-settings:')) {
            shell.openExternal(target);
            return true;
        }

        const userHome = process.env.USERPROFILE || ('C:\\Users\\' + (process.env.USERNAME || 'User'));

        // Pastikan Terminal & CLI selalu dibuka di direktori profil user (C:\Users\M S I), bukan di folder project
        const tLower = target.toLowerCase().trim();
        if (tLower === 'wt' || tLower === 'wt.exe') {
            try {
                const child = spawn('wt.exe', ['-d', userHome], {
                    cwd: userHome,
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
                return true;
            } catch (e) {
                // fallback
            }
        }

        if (tLower === 'powershell' || tLower === 'powershell.exe') {
            try {
                const child = spawn('powershell.exe', [], {
                    cwd: userHome,
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
                return true;
            } catch (e) {
                // fallback
            }
        }

        if (fs.existsSync(target)) {
            const err = await shell.openPath(target);
            if (!err) return true;
        }

        try {
            const child = spawn('cmd.exe', ['/c', 'start', '""', '/d', userHome, target], {
                cwd: userHome,
                windowsHide: true,
                detached: true,
                stdio: 'ignore'
            });
            child.unref();
            return true;
        } catch (e) {
            console.error('Launch error:', e);
            return false;
        }
    });

    // Native Windows Power & Session Management
    ipcMain.handle('power-action', async (event, action) => {
        try {
            if (action === 'exit-shell') {
                app.quit();
                return true;
            }
            if (action === 'shutdown') {
                spawn('shutdown.exe', ['/s', '/t', '0'], { windowsHide: true, detached: true });
                return true;
            }
            if (action === 'restart') {
                spawn('shutdown.exe', ['/r', '/t', '0'], { windowsHide: true, detached: true });
                return true;
            }
            if (action === 'sleep') {
                spawn('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0'], { windowsHide: true, detached: true });
                return true;
            }
            if (action === 'hibernate') {
                spawn('shutdown.exe', ['/h'], { windowsHide: true, detached: true });
                return true;
            }
            if (action === 'lock') {
                spawn('rundll32.exe', ['user32.dll,LockWorkStation'], { windowsHide: true, detached: true });
                return true;
            }
        } catch (e) {
            console.error('Power action error:', e);
            return false;
        }
        return false;
    });

    ipcMain.on('close-app', () => {
        app.quit();
    });

    // Read real installed apps from Windows Start Menu (Cached in Memory)
    let cachedAppsList = null;
    ipcMain.handle('get-installed-apps', async () => {
        if (cachedAppsList && cachedAppsList.length > 0) {
            return cachedAppsList;
        }

        const appPaths = [
            path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft\\Windows\\Start Menu\\Programs'),
            path.join(process.env.APPDATA || '', 'Microsoft\\Windows\\Start Menu\\Programs')
        ];

        let appsList = [];
        const seenNames = new Set();

        function scanDirectory(dir) {
            if (!fs.existsSync(dir)) return;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        scanDirectory(fullPath);
                    } else if (entry.name.endsWith('.lnk')) {
                        const cleanName = entry.name.replace('.lnk', '').trim();
                        const lower = cleanName.toLowerCase();
                        
                        if (
                            !seenNames.has(lower) &&
                            !lower.includes('uninstall') &&
                            !lower.includes('help') &&
                            !lower.includes('readme') &&
                            !lower.includes('documentation') &&
                            !lower.includes('url')
                        ) {
                            seenNames.add(lower);
                            appsList.push({
                                name: cleanName,
                                path: fullPath,
                                category: guessCategory(cleanName)
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('Error scanning folder:', e);
            }
        }

        for (const p of appPaths) {
            scanDirectory(p);
        }

        appsList.sort((a, b) => a.name.localeCompare(b.name));
        cachedAppsList = appsList;
        return appsList;
    });

    // Quick Note IPC Handlers
    ipcMain.on('toggle-quick-note', () => {
        toggleNoteWindow();
    });

    ipcMain.on('hide-quick-note', () => {
        if (noteWindow && !noteWindow.isDestroyed()) {
            noteWindow.hide();
        }
    });

    const noteFilePath = path.join(__dirname, 'quicknote.txt');

    ipcMain.handle('get-quick-note', () => {
        try {
            if (fs.existsSync(noteFilePath)) {
                return fs.readFileSync(noteFilePath, 'utf8');
            }
        } catch (e) {
            console.error("Error reading quicknote.txt:", e);
        }
        return '';
    });

    ipcMain.handle('save-quick-note', (event, content) => {
        try {
            fs.writeFileSync(noteFilePath, content || '', 'utf8');
            return true;
        } catch (e) {
            console.error("Error saving quicknote.txt:", e);
            return false;
        }
    });

    ipcMain.on('close-app', () => {
        app.quit();
    });
}

function getNoteWindowBounds() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;
    const width = 390;
    const height = 500;
    const x = workArea.x + workArea.width - width - 20; // 20px dari tepi kanan desktop
    const y = Math.floor(workArea.y + (workArea.height - height) / 2); // vertikal tengah di sisi kanan
    return { x, y, width, height };
}

function createNoteWindow() {
    if (noteWindow && !noteWindow.isDestroyed()) return noteWindow;

    const bounds = getNoteWindowBounds();

    noteWindow = new BrowserWindow({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        transparent: true,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false
        }
    });

    noteWindow.loadFile(path.join(__dirname, 'note.html'));

    return noteWindow;
}

function toggleNoteWindow() {
    if (!noteWindow || noteWindow.isDestroyed()) {
        createNoteWindow();
        noteWindow.once('ready-to-show', () => {
            const bounds = getNoteWindowBounds();
            noteWindow.setBounds(bounds);
            noteWindow.show();
            noteWindow.focus();
            noteWindow.webContents.send('note-focus');
        });
        return;
    }

    if (noteWindow.isVisible()) {
        noteWindow.hide();
    } else {
        const bounds = getNoteWindowBounds();
        noteWindow.setBounds(bounds);
        noteWindow.show();
        noteWindow.focus();
        noteWindow.webContents.send('note-focus');
    }
}

function guessCategory(name) {
    const n = name.toLowerCase();
    if (n.includes('chrome') || n.includes('edge') || n.includes('firefox') || n.includes('brave') || n.includes('browser')) return 'Internet';
    if (n.includes('code') || n.includes('studio') || n.includes('git') || n.includes('terminal') || n.includes('powershell')) return 'Dev';
    if (n.includes('spotify') || n.includes('music') || n.includes('vlc') || n.includes('media') || n.includes('video')) return 'Media';
    if (n.includes('game') || n.includes('steam') || n.includes('epic') || n.includes('riot') || n.includes('genshin')) return 'Games';
    if (n.includes('discord') || n.includes('telegram') || n.includes('whatsapp') || n.includes('slack')) return 'Chat';
    if (n.includes('word') || n.includes('excel') || n.includes('notes') || n.includes('obsidian') || n.includes('office')) return 'Office';
    return 'Apps';
}

// Ensure ONLY ONE single instance of the sidebar desktop shell can run at any time!
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // If an instance is already running, immediately quit this secondary launch!
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, focus the existing one without reloading
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();
        createNoteWindow();

        // Daftarkan Global Shortcut Alt+N untuk membuka/menutup Quick Note dari mana saja
        try {
            globalShortcut.register('Alt+N', () => {
                toggleNoteWindow();
            });
        } catch (e) {
            console.error("Gagal mendaftarkan shortcut Alt+N:", e);
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
                createNoteWindow();
            }
        });
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
}

