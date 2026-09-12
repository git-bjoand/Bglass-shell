# ?? Bglass-Shell (BJOAND)

<p align="center">
  <img src="image.png" alt="Bglass-Shell Desktop Environment Preview" width="100%">
</p>

<p align="center">
  <a href="https://www.microsoft.com"><img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4.svg?style=for-the-badge&logo=windows" alt="Windows"></a>
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Framework-Electron%2034-47848f.svg?style=for-the-badge&logo=electron" alt="Electron"></a>
  <img src="https://img.shields.io/badge/RAM%20Usage-~60--100%20MB-2ea44f.svg?style=for-the-badge" alt="RAM Footprint">
  <img src="https://img.shields.io/badge/License-MIT-e36209.svg?style=for-the-badge" alt="License">
</p>

---

## ?? Overview

**Bglass-Shell** is a lightweight, minimalist glassmorphic desktop environment and productivity suite for Windows. Engineered with native Electron and modern frosted acrylic glass aesthetics, **Bglass-Shell** seamlessly integrates:

1. ??? **Clean Glass Sidebar (Left Dock)**: An auto-scaling application launcher, Start Menu search engine, real-time hardware telemetry (CPU & RAM), and native power controls.
2. ?? **Instant Quick Note (Right Window - `Alt + N`)**: A distraction-free, high-contrast obsidian scratchpad with live dual auto-save and word counters.

Designed from the ground up for speed, low memory usage (~60–100 MB RAM), and zero distraction — floating gracefully above whatever personal desktop wallpaper you use.

---

## ? Key Features

### ??? 1. Clean Glass Dock & Search Panel
- **Zero-Hitbox Idle Passthrough**: When idle, the sidebar shrinks into a discreet 16px edge pill indicator. Mouse clicks pass 100% through to games and background windows (`setIgnoreMouseEvents(true, { forward: true })`).
- **Dynamic Auto-Scaling**: Dock height automatically scales based on the number of pinned apps (supports up to 8 pinned apps).
- **Start Menu Search Engine**: Type to instantly filter and launch all installed Windows applications.
- **Hardware Telemetry Widgets**: Real-time CPU Load (%) and RAM Memory utilization (GB / %) bars.
- **Direct Explorer App Picker (`+`)**: Pick any executable (`.exe`), shortcut (`.lnk`), or URL directly from File Explorer.
- **Power & Session Management**: Dedicated floating popover for Shutdown, Restart, Sleep, Hibernate, and Screen Lock.

### ?? 2. Instant Quick Note (`Alt + N`)
- **Global Hotkey (`Alt + N`)**: Summon and dismiss the note scratchpad instantly from anywhere in Windows.
- **High-Contrast Typography**: Ultra-legible pure white text on deep obsidian frosted glass (contrast ratio > 18:1).
- **Dual Keystroke Auto-Save**: Saves instantly to `localStorage` and automatically commits to `quicknote.txt`.
- **Crisp Inline SVG Icons**: Feather badge, Copy to Clipboard with toast feedback, Clear note, and Close buttons.
- **Live Counter**: Real-time word and character counter (`X kata • Y karakter`).

### ? 3. Lightweight & Bloat-Free
- **Standalone Runtime**: Completely independent of third-party wallpaper engines (0% idle CPU overhead).
- **Universal Wallpaper Support**: Floats with translucent frosted glass above your existing Windows wallpaper without modifying system backgrounds.
- **Silent Boot Option**: Includes `Bglass-shell.vbs` for Windows Startup without console window flashes.

---

## ?? System Requirements

| Requirement | Specification |
| :--- | :--- |
| **Operating System** | Windows 10 (Build 19041+) or Windows 11 (64-bit) |
| **Node.js** | Node.js v18.0.0 or higher (v20+ or v24 recommended) |
| **Package Manager** | `npm` (bundled with Node.js) |
| **Hardware** | Any modern x64 processor, 4 GB+ RAM |

---

## ?? Installation & Setup Guide

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/bjoand-shell.git
cd bjoand-shell
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch the Shell
You can launch **Bglass-Shell** immediately using either method:
- **Direct Launch**: Double-click `Bglass-shell.bat`
- **Via Command Line**:
  ```bash
  npm start
  ```

---

## ?? Auto-Start on Windows Boot (Silent)

To automatically launch **Bglass-Shell** silently when your computer starts:

1. Press `Win + R` on your keyboard to open the **Run** dialog.
2. Type `shell:startup` and press **Enter** (opens your Windows Startup folder).
3. Right-click inside the folder > **New** > **Shortcut**.
4. Set the Target path to:
   ```text
   wscript.exe "D:\project\bjoand-shell\Bglass-shell.vbs"
   ```
   *(Update the folder path if your project is located in another directory).*
5. Name the shortcut `Bglass-Shell` and click **Finish**.

> [!NOTE]
> **Why `Bglass-shell.vbs`?**  
> `Bglass-shell.vbs` runs the process through Windows Script Host in the background, ensuring **zero black CMD console flashes** appear during Windows login.

---

## ?? Shortcuts & Controls

| Shortcut / Trigger | Action |
| :--- | :--- |
| **`Alt + N`** | Toggle Quick Note window open / closed from anywhere. |
| **Hover Left Screen Edge** | Reveal and slide in the glass dock from idle mode. |
| **`Esc`** | Dismiss Quick Note or active search / power panel. |
| **`Win` Key or Click Outside** | Auto-collapse sidebar back into idle mode. |
| **Click `(+)` on Dock** | Open File Explorer to select and pin any app. |

---

## ?? Project Structure

```text
bjoand-shell/
+-- .gitignore              # Ignores node_modules and logs
+-- Bglass-shell.bat        # Manual batch launcher
+-- Bglass-shell.vbs        # Silent background launcher (for Windows Startup)
+-- image.png               # Showcase preview screenshot
+-- index.html              # Left sidebar & dock interface
+-- style.css               # Glassmorphism styling, animations & theme
+-- script.js               # Dock controller, app search & telemetry
+-- note.html               # Quick Note window interface
+-- note.css                # High-contrast obsidian glass styling
+-- note.js                 # Dual auto-save & stats counter logic
+-- quicknote.txt           # Persistent text storage for quick notes
+-- main.js                 # Electron process (window manager & IPC)
+-- package.json            # Manifest & project metadata
+-- package-lock.json       # Lockfile
```

---

## ?? License

This project is licensed under the **MIT License** — feel free to use, customize, and modify it for your personal desktop setup.
