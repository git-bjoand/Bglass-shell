// Direct Native Electron IPC Integration (100% Bebas Preload)
if (typeof require !== 'undefined') {
    try {
        const { ipcRenderer } = require('electron');
        window.electronAPI = {
            getQuickNote: () => ipcRenderer.invoke('get-quick-note'),
            saveQuickNote: (text) => ipcRenderer.invoke('save-quick-note', text),
            hideQuickNote: () => ipcRenderer.send('hide-quick-note'),
            onNoteFocus: (callback) => ipcRenderer.on('note-focus', () => callback())
        };
    } catch (e) {
        console.warn("Bukan di lingkungan Electron:", e);
    }
}

// DOM Elements
const textarea = document.getElementById("noteTextarea");
const saveIndicator = document.getElementById("saveIndicator");
const saveStatusText = document.getElementById("saveStatusText");
const noteStats = document.getElementById("noteStats");
const copyBtn = document.getElementById("copyNoteBtn");
const clearBtn = document.getElementById("clearNoteBtn");
const closeBtn = document.getElementById("closeNoteBtn");
const copyFeedback = document.getElementById("copyFeedback");

let saveTimeout = null;

// 1. Update Character & Word Counter
function updateStats(text = "") {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    noteStats.textContent = `${words} kata • ${chars} karakter`;
}

// 2. Auto-Save Logic (LocalStorage & Disk File)
function saveNoteContent(content) {
    // Simpan instan ke browser storage
    try {
        localStorage.setItem("clean_glass_quick_note", content);
    } catch (e) {}

    // Simpan ke disk file via Electron IPC
    if (window.electronAPI && window.electronAPI.saveQuickNote) {
        window.electronAPI.saveQuickNote(content).then(() => {
            saveIndicator.classList.remove("saving");
            saveStatusText.textContent = "Tersimpan";
        }).catch(() => {
            saveIndicator.classList.remove("saving");
            saveStatusText.textContent = "Tersimpan (Lokal)";
        });
    } else {
        saveIndicator.classList.remove("saving");
        saveStatusText.textContent = "Tersimpan (Lokal)";
    }
}

// 3. Textarea Input Listener
textarea.addEventListener("input", (e) => {
    const content = e.target.value;
    updateStats(content);

    // Simpan instan ke localStorage pada setiap ketikan (0ms delay)
    try {
        localStorage.setItem("clean_glass_quick_note", content);
    } catch (err) {}

    // Tampilkan status saving
    saveIndicator.classList.add("saving");
    saveStatusText.textContent = "Menyimpan...";

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveNoteContent(content);
    }, 300);
});

// Pastikan tersimpan saat textarea blur, window blur, atau sebelum shutdown / unload
textarea.addEventListener("blur", () => {
    clearTimeout(saveTimeout);
    saveNoteContent(textarea.value);
});

window.addEventListener("beforeunload", () => {
    saveNoteContent(textarea.value);
});

window.addEventListener("pagehide", () => {
    saveNoteContent(textarea.value);
});

// 4. Load Saved Note on Startup
async function loadSavedNote() {
    let loadedContent = "";
    try {
        loadedContent = localStorage.getItem("clean_glass_quick_note") || "";
    } catch (e) {}

    if (window.electronAPI && window.electronAPI.getQuickNote) {
        try {
            const diskContent = await window.electronAPI.getQuickNote();
            if (diskContent) {
                loadedContent = diskContent;
            }
        } catch (e) {
            console.error("Gagal membaca disk note:", e);
        }
    }

    textarea.value = loadedContent;
    updateStats(loadedContent);

    // Auto-focus kursor di ujung teks
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

// 5. Action: Salin Catatan ke Clipboard
function copyNoteToClipboard() {
    const text = textarea.value;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        copyFeedback.classList.add("show");
        copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #2ed573;"></i>';

        setTimeout(() => {
            copyFeedback.classList.remove("show");
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 1600);
    }).catch(err => {
        console.error("Gagal menyalin:", err);
    });
}

copyBtn.addEventListener("click", copyNoteToClipboard);

// 6. Action: Kosongkan Catatan
clearBtn.addEventListener("click", () => {
    if (!textarea.value.trim()) return;
    
    if (confirm("Kosongkan seluruh isi catatan cepat?")) {
        textarea.value = "";
        updateStats("");
        saveNoteContent("");
        textarea.focus();
    }
});

// 7. Action: Tutup Jendela Quick Note
function closeQuickNote() {
    if (window.electronAPI && window.electronAPI.hideQuickNote) {
        window.electronAPI.hideQuickNote();
    }
}

closeBtn.addEventListener("click", closeQuickNote);

// 8. Keyboard Shortcuts
window.addEventListener("keydown", (e) => {
    // Esc: Tutup
    if (e.key === "Escape") {
        e.preventDefault();
        closeQuickNote();
        return;
    }

    // Ctrl + Shift + C: Salin
    if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        copyNoteToClipboard();
        return;
    }

    // Ctrl + S: Feedback simpan manual
    if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        saveNoteContent(textarea.value);
        return;
    }
});

// 9. Focus Trigger from Electron Main Process
if (window.electronAPI && window.electronAPI.onNoteFocus) {
    window.electronAPI.onNoteFocus(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
}

window.addEventListener("focus", () => {
    textarea.focus();
});

// Inisialisasi
loadSavedNote();
