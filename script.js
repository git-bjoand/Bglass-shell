// Direct Native Electron IPC Integration (100% Bebas Preload)
if (typeof require !== 'undefined') {
    try {
        const { ipcRenderer } = require('electron');
        window.electronAPI = {
            launchApp: (cmdOrPath) => ipcRenderer.invoke('launch-app', cmdOrPath),
            getInstalledApps: () => ipcRenderer.invoke('get-installed-apps'),
            selectAppFile: () => ipcRenderer.invoke('select-app-file'),
            setState: (stateName, options) => ipcRenderer.send('set-state', stateName, options),
            setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
            powerAction: (actionType) => ipcRenderer.invoke('power-action', actionType),
            closeApp: () => ipcRenderer.send('close-app'),
            onBlur: (callback) => ipcRenderer.on('window-blur', () => callback()),
            getConfig: () => ipcRenderer.invoke('get-config'),
            saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
            getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
            toggleQuickNote: () => ipcRenderer.send('toggle-quick-note')
        };
    } catch (e) {
        console.warn("Bukan di lingkungan Electron:", e);
    }
}

let installedApps = [];

const DEFAULT_PINNED = [
    {
        id: "chrome",
        name: "Google Chrome",
        category: "Internet",
        desc: "Web Browser",
        icon: "fa-brands fa-chrome",
        target: "chrome"
    },
    {
        id: "code",
        name: "Visual Studio Code",
        category: "Dev",
        desc: "Code Editor",
        icon: "fa-solid fa-code",
        target: "code"
    },
    {
        id: "wt",
        name: "Windows Terminal",
        category: "Dev",
        desc: "CLI & PowerShell",
        icon: "fa-solid fa-terminal",
        target: "wt"
    },
    {
        id: "spotify",
        name: "Spotify",
        category: "Media",
        desc: "Music Player",
        icon: "fa-brands fa-spotify",
        target: "spotify:"
    },
    {
        id: "explorer",
        name: "File Explorer",
        category: "System",
        desc: "Files & Folders",
        icon: "fa-regular fa-folder-open",
        target: "explorer"
    }
];

let pinnedApps = [];

function loadPinnedApps() {
    try {
        const saved = localStorage.getItem("clean_glass_pinned_apps");
        if (saved) {
            pinnedApps = JSON.parse(saved);
        } else {
            pinnedApps = [...DEFAULT_PINNED];
        }
    } catch (e) {
        pinnedApps = [...DEFAULT_PINNED];
    }
}

function savePinnedApps() {
    try {
        localStorage.setItem("clean_glass_pinned_apps", JSON.stringify(pinnedApps));
    } catch (e) {
        console.error("Gagal menyimpan pinned apps:", e);
    }
}

function isAppPinned(targetOrName) {
    const key = (targetOrName || "").toLowerCase();
    return pinnedApps.some(p => 
        (p.target && p.target.toLowerCase() === key) || 
        (p.name && p.name.toLowerCase() === key) ||
        (p.id && p.id.toLowerCase() === key)
    );
}

const MAX_PINNED_APPS = 8;

function togglePinApp(app, e) {
    if (e) e.stopPropagation();

    const targetKey = (app.target || app.path || app.name || "").toLowerCase();
    const existingIndex = pinnedApps.findIndex(p => 
        (p.target && p.target.toLowerCase() === targetKey) ||
        (p.name && p.name.toLowerCase() === app.name.toLowerCase())
    );

    if (existingIndex !== -1) {
        pinnedApps.splice(existingIndex, 1);
    } else {
        if (pinnedApps.length >= MAX_PINNED_APPS) {
            flashDockLimit();
            return;
        }
        pinnedApps.push({
            id: app.id || app.name.toLowerCase().replace(/\s+/g, '_'),
            name: app.name,
            category: app.category || 'App',
            icon: app.icon || getAppIcon(app.name, app.category),
            target: app.path || app.target || app.name
        });
    }

    savePinnedApps();
    renderDockMenu();
    updateDockScale();
    renderSuggestions();
    renderAppsList(searchInput.value);
}

function flashDockLimit() {
    if (dockBar) {
        dockBar.classList.remove("limit-reached");
        void dockBar.offsetWidth; // Force reflow
        dockBar.classList.add("limit-reached");
        setTimeout(() => {
            if (dockBar) dockBar.classList.remove("limit-reached");
        }, 500);
    }
}

// DOM Elements
const wrapper = document.getElementById("sidebarWrapper");
const dockBar = document.getElementById("dockBar");
const dockEdgeTrigger = document.getElementById("dockEdgeTrigger");
const dockEdgePill = document.getElementById("dockEdgePill");
const dockMenu = document.getElementById("dockMenu");
const addAppDockBtn = document.getElementById("addAppDockBtn");
const toggleBtn = document.getElementById("toggleBtn");
const searchInput = document.getElementById("appSearchInput");
const suggestionsContainer = document.getElementById("suggestionsContainer");
const appsListContainer = document.getElementById("appsListContainer");
const appCount = document.getElementById("appCount");
const clockTime = document.getElementById("clockTime");
const clockSeconds = document.getElementById("clockSeconds");
const clockDate = document.getElementById("clockDate");
const quickNoteDockBtn = document.getElementById("quickNoteDockBtn");
const closeShellBtn = document.getElementById("closeShellBtn");
const powerPanel = document.getElementById("powerPanel");
const closePowerBtn = document.getElementById("closePowerBtn");
const settingsBtn = document.getElementById("settingsBtn");
const taskmgrBtn = document.getElementById("taskmgrBtn");
const cpuCard = document.getElementById("cpuCard");
const ramCard = document.getElementById("ramCard");
const cpuUsageVal = document.getElementById("cpuUsageVal");
const cpuBarFill = document.getElementById("cpuBarFill");
const ramUsageVal = document.getElementById("ramUsageVal");
const ramBarFill = document.getElementById("ramBarFill");

const isElectron = !!window.electronAPI;
let currentState = 'idle';
let collapseTimer = null;

// Telemetri CPU & RAM Real-Time
async function updateHardwareTelemetry() {
    if (currentState !== 'panel') return;

    if (window.electronAPI && window.electronAPI.getSystemStats) {
        try {
            const stats = await window.electronAPI.getSystemStats();
            if (stats) {
                if (cpuUsageVal) cpuUsageVal.textContent = `${stats.cpuPercent}%`;
                if (cpuBarFill) cpuBarFill.style.width = `${stats.cpuPercent}%`;

                if (ramUsageVal) ramUsageVal.textContent = `${stats.ramPercent}% (${stats.ramUsedGB}/${stats.ramTotalGB} GB)`;
                if (ramBarFill) ramBarFill.style.width = `${stats.ramPercent}%`;
            }
        } catch (e) {
            console.error("Telemetry error:", e);
        }
    } else {
        const mockCpu = Math.floor(12 + Math.random() * 25);
        const mockRam = Math.floor(45 + Math.random() * 8);
        if (cpuUsageVal) cpuUsageVal.textContent = `${mockCpu}%`;
        if (cpuBarFill) cpuBarFill.style.width = `${mockCpu}%`;

        if (ramUsageVal) ramUsageVal.textContent = `${mockRam}% (7.2/16 GB)`;
        if (ramBarFill) ramBarFill.style.width = `${mockRam}%`;
    }
}

let telemetryTimer = null;
function startTelemetry() {
    stopTelemetry();
    updateHardwareTelemetry();
    telemetryTimer = setInterval(updateHardwareTelemetry, 1500);
}

function stopTelemetry() {
    if (telemetryTimer) {
        clearInterval(telemetryTimer);
        telemetryTimer = null;
    }
}

if (cpuCard) {
    cpuCard.addEventListener("click", () => {
        launchApp("taskmgr", "Task Manager");
    });
}
if (ramCard) {
    ramCard.addEventListener("click", () => {
        launchApp("taskmgr", "Task Manager");
    });
}

// 1. Digital Clock
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    
    clockTime.textContent = `${h}:${m}`;
    clockSeconds.textContent = s;

    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    
    clockDate.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
}
setInterval(updateClock, 1000);
updateClock();

// 2. Render Dock Pinned Apps
function renderDockMenu() {
    dockMenu.innerHTML = "";
    pinnedApps.forEach(app => {
        const li = document.createElement("li");
        li.className = "dock-item";
        li.setAttribute("title", `${app.name} (Klik kanan untuk mencopot)`);
        
        let iconClass = app.icon || getAppIcon(app.name, app.category);
        li.innerHTML = `<i class="${iconClass}"></i>`;
        
        // Left click -> Launch
        li.addEventListener("click", (e) => {
            e.stopPropagation();
            launchApp(app.target, app.name);
        });

        // Right click -> Unpin
        li.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePinApp(app);
        });

        dockMenu.appendChild(li);
    });

    // Update Add (+) button visibility dan counter tooltip
    if (addAppDockBtn) {
        if (pinnedApps.length >= MAX_PINNED_APPS) {
            addAppDockBtn.style.display = "none";
        } else {
            addAppDockBtn.style.display = "grid";
            addAppDockBtn.title = `Tambah Aplikasi (${pinnedApps.length}/${MAX_PINNED_APPS})`;
        }
    }
}

// Auto-Scale Dock Dynamic Height Calculation
function getDynamicDockHeight() {
    const count = Math.min(pinnedApps.length, MAX_PINNED_APPS);
    const addBtnVisible = count < MAX_PINNED_APPS;
    const addBtnHeight = addBtnVisible ? 48 : 0;
    // Header (indicator + trigger + separator) ~ 85px
    // Items: count * 50px (each 42px + 8px gap)
    // Footer (separator + quicknote + power + emblem) ~ 147px
    // Padding & border ~ 32px
    const calculated = 264 + (count * 50) + addBtnHeight;
    return Math.max(370, calculated);
}

function updateDockScale() {
    if (currentState === 'dock' || currentState === 'power') {
        const h = getDynamicDockHeight();
        if (window.electronAPI && window.electronAPI.setState) {
            window.electronAPI.setState(currentState, { height: h });
        }
    }
}

// 3. State Machine (idle <-> dock <-> panel <-> power)
function setAppState(newState) {
    if (currentState === newState) return;
    currentState = newState;

    wrapper.classList.remove("state-idle", "state-dock", "state-panel", "state-power");
    wrapper.classList.add(`state-${newState}`);

    if (window.electronAPI && window.electronAPI.setState) {
        if (newState === 'dock' || newState === 'power') {
            window.electronAPI.setState(newState, { height: getDynamicDockHeight() });
        } else {
            window.electronAPI.setState(newState);
        }
    }

    // Zero-Hitbox: Saat idle, mouse click diteruskan ke game/desktop di bawahnya
    if (newState === 'idle') {
        if (window.electronAPI && window.electronAPI.setIgnoreMouseEvents) {
            window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
        }
    } else {
        if (window.electronAPI && window.electronAPI.setIgnoreMouseEvents) {
            window.electronAPI.setIgnoreMouseEvents(false);
        }
    }

    if (newState === 'panel') {
        setTimeout(() => searchInput.focus(), 120);
        renderSuggestions();
        renderAppsList();
        startTelemetry();
    } else {
        stopTelemetry();
        if (newState === 'idle') {
            searchInput.value = "";
            dockBar.classList.remove("closing-pending", "anim-exiting");
            // Bebaskan memori ratusan DOM nodes saat mengendap di desktop (idle)
            appsListContainer.innerHTML = "";
        }
    }
}

// Hover trigger on Edge Pill or Dock Bar -> Slide IN smoothly!
function openDock() {
    clearTimeout(collapseTimer);
    dockBar.classList.remove("closing-pending", "anim-exiting");
    if (currentState === 'idle') {
        if (window.electronAPI && window.electronAPI.setIgnoreMouseEvents) {
            window.electronAPI.setIgnoreMouseEvents(false);
        }
        setAppState('dock');
    }
}

if (dockEdgePill) {
    dockEdgePill.addEventListener("mouseenter", openDock);
    dockEdgePill.addEventListener("click", openDock);
}
dockBar.addEventListener("mouseenter", openDock);

// Deteksi kursor menyentuh edge pill saat idle untuk membuka dock
window.addEventListener("mousemove", (e) => {
    if (currentState === 'idle') {
        const pill = document.getElementById("dockEdgePill");
        if (pill) {
            const rect = pill.getBoundingClientRect();
            if (e.clientX <= rect.right + 4 && e.clientY >= rect.top - 6 && e.clientY <= rect.bottom + 6) {
                openDock();
            }
        }
    }
});

// Leave trigger on entire Wrapper -> Auto-collapse dalam 0.5 detik untuk SEMUA mode (dock, panel, power)
wrapper.addEventListener("mouseleave", () => {
    if (currentState !== 'idle' && currentState !== 'welcome') {
        clearTimeout(collapseTimer);
        
        if (currentState === 'dock') {
            dockBar.classList.add("closing-pending");
            collapseTimer = setTimeout(() => {
                dockBar.classList.remove("closing-pending");
                dockBar.classList.add("anim-exiting");
                setTimeout(() => {
                    dockBar.classList.remove("anim-exiting");
                    setAppState('idle');
                }, 260);
            }, 500);
        } else {
            // Panel atau Power: tutup kembali ke idle setelah 0.5 detik jika mouse keluar dari box
            collapseTimer = setTimeout(() => {
                setAppState('idle');
            }, 500);
        }
    }
});

// Jika mouse keluar sepenuhnya dari jendela Electron
document.addEventListener("mouseleave", () => {
    if (currentState !== 'idle' && currentState !== 'welcome') {
        clearTimeout(collapseTimer);
        collapseTimer = setTimeout(() => {
            setAppState('idle');
        }, 500);
    }
});

// Klik di luar box (area transparan di sekitar panel/dock) -> Langsung tutup!
document.addEventListener("pointerdown", (e) => {
    if (currentState === 'panel' || currentState === 'power') {
        const gp = document.getElementById("glassPanel");
        const pp = document.getElementById("powerPanel");
        const inside = (gp && gp.contains(e.target)) || 
                       (pp && pp.contains(e.target)) || 
                       (dockBar && dockBar.contains(e.target));
        if (!inside) {
            setAppState('idle');
        }
    }
});

wrapper.addEventListener("mouseenter", () => {
    clearTimeout(collapseTimer);
    dockBar.classList.remove("closing-pending", "anim-exiting");
});

// Toggle Fire Button -> Opens/Closes Search Panel
toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentState === 'panel') {
        setAppState('dock');
    } else {
        setAppState('panel');
    }
});

// DIRECT TO EXPLORER: Klik tombol (+) langsung buka File Picker Windows
addAppDockBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (pinnedApps.length >= MAX_PINNED_APPS) {
        flashDockLimit();
        return;
    }
    if (window.electronAPI && window.electronAPI.selectAppFile) {
        try {
            const selected = await window.electronAPI.selectAppFile();
            if (selected) {
                togglePinApp({
                    name: selected.name,
                    path: selected.path,
                    category: 'Custom'
                });
            }
        } catch (err) {
            console.error("Gagal membuka explorer:", err);
        }
    }
});

// Close on Escape Key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (currentState === 'power' || currentState === 'panel') {
            setAppState('dock');
        } else {
            setAppState('idle');
        }
    }
});

// Tutup sidebar otomatis jika tombol Windows (Win / Meta) ditekan
window.addEventListener("keydown", (e) => {
    if (e.key === "Meta" || e.key === "OS" || e.keyCode === 91 || e.keyCode === 92) {
        if (currentState !== 'idle') {
            setAppState('idle');
        }
    }
});

// Tutup sidebar otomatis jika berinteraksi di luar sidebar (klik desktop/aplikasi lain -> blur)
window.addEventListener("blur", () => {
    if (currentState !== 'idle') {
        setAppState('idle');
    }
});

if (window.electronAPI && window.electronAPI.onBlur) {
    window.electronAPI.onBlur(() => {
        if (currentState !== 'idle') {
            setAppState('idle');
        }
    });
}

// Brand Emblem di dock bawah -> Klik untuk toggle panel pencarian
const dockBrandEmblem = document.getElementById("dockBrandEmblem");
if (dockBrandEmblem) {
    dockBrandEmblem.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentState === 'panel') {
            setAppState('dock');
        } else {
            setAppState('panel');
        }
    });
}

// 4. Initialize Apps (Boot Langsung Tanpa Preload / Layar Sambutan)
async function initInstalledApps() {
    if (!window.electronAPI) {
        document.body.classList.add("standalone-preview", "in-browser");
    } else {
        document.body.classList.add("in-electron");
    }
    loadPinnedApps();
    renderDockMenu();

    // Load real installed apps in background
    if (window.electronAPI && window.electronAPI.getInstalledApps) {
        try {
            installedApps = await window.electronAPI.getInstalledApps();
        } catch (e) {
            console.error("Gagal memuat aplikasi:", e);
        }
    }
    renderSuggestions();

    // Langsung aktifkan dock idle tanpa preload screen apapun
    setAppState('idle');
}

function renderSuggestions() {
    suggestionsContainer.innerHTML = "";
    DEFAULT_PINNED.slice(0, 4).forEach(app => {
        const card = document.createElement("div");
        card.className = "suggestion-card";
        const isPinned = isAppPinned(app.target || app.name);
        const isFull = !isPinned && pinnedApps.length >= MAX_PINNED_APPS;
        const pinTitle = isPinned ? 'Copot dari sidebar' : (isFull ? `Maksimal ${MAX_PINNED_APPS} aplikasi (Copot salah satu terlebih dahulu)` : 'Sematkan ke sidebar');
        
        card.innerHTML = `
            <div class="suggestion-left">
                <div class="suggestion-icon"><i class="${app.icon}"></i></div>
                <div class="suggestion-info">
                    <span class="suggestion-title">${app.name}</span>
                    <span class="suggestion-desc">${app.desc}</span>
                </div>
            </div>
            <button class="app-pin-btn ${isPinned ? 'pinned' : ''} ${isFull ? 'limit-reached' : ''}" title="${pinTitle}">
                <i class="fa-solid fa-thumbtack"></i>
            </button>
        `;

        card.addEventListener("click", () => launchApp(app.target, app.name));
        
        const pinBtn = card.querySelector(".app-pin-btn");
        pinBtn.addEventListener("click", (e) => togglePinApp(app, e));

        suggestionsContainer.appendChild(card);
    });
}

function renderAppsList(query = "") {
    const q = query.toLowerCase().trim();
    const listToSearch = installedApps.length > 0 ? installedApps : DEFAULT_PINNED;

    const filtered = listToSearch.filter(app => 
        app.name.toLowerCase().includes(q) || 
        (app.category && app.category.toLowerCase().includes(q))
    );

    appsListContainer.innerHTML = "";
    appCount.textContent = `${filtered.length} apps`;

    if (filtered.length === 0) {
        appsListContainer.innerHTML = `
            <div style="text-align: center; padding: 25px; color: var(--text-muted); font-size: 12px;">
                <i class="fa-solid fa-ghost" style="font-size: 20px; margin-bottom: 8px; display: block;"></i>
                Aplikasi "${query}" tidak ditemukan
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach(app => {
        const item = document.createElement("div");
        item.className = "app-row-item";
        
        let iconClass = getAppIcon(app.name, app.category);
        const target = app.path || app.target || app.name;
        const isPinned = isAppPinned(target || app.name);
        const isFull = !isPinned && pinnedApps.length >= MAX_PINNED_APPS;
        const pinTitle = isPinned ? 'Copot dari sidebar' : (isFull ? `Maksimal ${MAX_PINNED_APPS} aplikasi (Copot salah satu terlebih dahulu)` : 'Sematkan ke sidebar');

        item.innerHTML = `
            <div class="app-row-left">
                <i class="${iconClass} app-row-icon"></i>
                <span class="app-row-name">${app.name}</span>
            </div>
            <div class="app-row-actions">
                <span class="app-row-badge">${app.category || 'App'}</span>
                <button class="app-pin-btn ${isPinned ? 'pinned' : ''} ${isFull ? 'limit-reached' : ''}" title="${pinTitle}">
                    <i class="fa-solid fa-thumbtack"></i>
                </button>
            </div>
        `;

        item.addEventListener("click", () => launchApp(target, app.name));

        const pinBtn = item.querySelector(".app-pin-btn");
        pinBtn.addEventListener("click", (e) => togglePinApp({
            name: app.name,
            category: app.category,
            icon: iconClass,
            target: target
        }, e));

        fragment.appendChild(item);
    });

    appsListContainer.appendChild(fragment);
}

function getAppIcon(name, category) {
    const n = name.toLowerCase();
    if (n.includes("chrome")) return "fa-brands fa-chrome";
    if (n.includes("edge")) return "fa-brands fa-edge";
    if (n.includes("firefox")) return "fa-brands fa-firefox";
    if (n.includes("brave")) return "fa-brands fa-brave";
    if (n.includes("code") || n.includes("studio")) return "fa-solid fa-code";
    if (n.includes("terminal") || n.includes("powershell") || n.includes("command")) return "fa-solid fa-terminal";
    if (n.includes("spotify")) return "fa-brands fa-spotify";
    if (n.includes("discord")) return "fa-brands fa-discord";
    if (n.includes("steam")) return "fa-brands fa-steam";
    if (n.includes("word") || n.includes("doc")) return "fa-solid fa-file-word";
    if (n.includes("excel") || n.includes("sheet")) return "fa-solid fa-file-excel";
    if (n.includes("setting")) return "fa-solid fa-gear";
    if (n.includes("paint") || n.includes("photo") || n.includes("image")) return "fa-solid fa-image";
    if (n.includes("game")) return "fa-solid fa-gamepad";
    return "fa-solid fa-cube";
}

// 5. Launch App (Silent Native Launch)
async function launchApp(target, name = "Aplikasi") {
    if (window.electronAPI && window.electronAPI.launchApp) {
        await window.electronAPI.launchApp(target);
    }

    setAppState('idle');
}

// 6. Search Bar Input (Hardware-synced 60fps typing)
let searchRaf = null;
searchInput.addEventListener("input", (e) => {
    if (searchRaf) cancelAnimationFrame(searchRaf);
    searchRaf = requestAnimationFrame(() => {
        renderAppsList(e.target.value);
    });
});

// 7. Footer Actions
settingsBtn.addEventListener("click", () => launchApp("ms-settings:", "Windows Settings"));
taskmgrBtn.addEventListener("click", () => launchApp("taskmgr", "Task Manager"));

if (quickNoteDockBtn) {
    quickNoteDockBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.electronAPI && window.electronAPI.toggleQuickNote) {
            window.electronAPI.toggleQuickNote();
        }
    });
}

// Power & Session Panel Toggle
if (closeShellBtn) {
    closeShellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentState === 'power') {
            setAppState('dock');
        } else {
            setAppState('power');
        }
    });
}

if (closePowerBtn) {
    closePowerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setAppState('dock');
    });
}

// Power Option Buttons Handling (Shutdown, Restart, Sleep, Hibernate, Lock, Exit)
document.querySelectorAll(".power-option-item").forEach(item => {
    item.addEventListener("click", async (e) => {
        e.stopPropagation();
        const action = item.getAttribute("data-power");
        if (!action) return;

        if (window.electronAPI && window.electronAPI.powerAction) {
            await window.electronAPI.powerAction(action);
        }

        if (action !== "exit-shell") {
            setAppState('idle');
        }
    });
});

// Initialize
initInstalledApps();
