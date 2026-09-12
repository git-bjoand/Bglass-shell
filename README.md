# ?? Bglass-Shell (BJOAND)

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4.svg?style=flat-square&logo=windows)](https://www.microsoft.com)
[![Framework](https://img.shields.io/badge/Framework-Electron%2034-47848f.svg?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![RAM Footprint](https://img.shields.io/badge/RAM%20Idle-~60--100%20MB-brightgreen.svg?style=flat-square)](https://github.com)

A lightweight, minimalist glassmorphic desktop environment companion for Windows. Built with native Electron and frosted acrylic glass styling, **Bglass-Shell** combines an auto-scaling app dock with hardware telemetry and an instant, distraction-free **Quick Note (`Alt + N`)**.

---

## ? Features Overview

### 1. ??? Clean Glass Sidebar (Left Dock)
- **Zero-Hitbox Idle Passthrough**: When idle, the sidebar shrinks into a sleek 16px edge pill indicator. Mouse clicks pass directly through to games and underlying windows (`setIgnoreMouseEvents(true, { forward: true })`).
- **Dynamic Auto-Scaling**: Dock height automatically calculates and scales depending on your pinned apps (supports up to 8 pinned applications).
- **Direct App Picker (+)**: Click the plus button to pick any `.exe`, `.lnk`, or `.url` shortcut directly from Windows File Explorer.
- **Search & Start Menu Integration**: Real-time app search indexed from Windows Start Menu programs.
- **Live Hardware Telemetry**: Low-overhead real-time CPU & RAM usage telemetry widgets.
- **Power & Session Control**: Instant access to Shutdown, Restart, Sleep, Hibernate, and Screen Lock.

### 2. ?? Instant Quick Note (`Alt + N`)
- **Global Shortcut**: Press `Alt + N` from anywhere in Windows to summon or dismiss the note window.
- **High-Contrast Typography**: Ultra-legible pure white text on deep obsidian frosted glass (contrast ratio > 18:1).
- **Dual Instant Auto-Save**: Saves keystroke-by-keystroke to `localStorage` and automatically commits to `quicknote.txt`.
- **Quick Utility Actions**: One-click Copy to Clipboard with toast confirmation, Clear, and live word/character statistics.

### 3. ? Zero-Bloat Performance
- **Standalone Runtime**: Runs completely independently of third-party wallpaper engines (0% idle CPU overhead).
- **Native Wallpaper Compatibility**: Floats with translucent frosted glass above your existing Windows desktop background.
- **Silent Boot**: Includes `Bglass-shell.vbs` for Windows Startup without command-prompt flashes.

---

## ??? Results & Preview

```text
 +---------------------------+                        +------------------------------+
 ¦ [•] Indicator Pill (Idle) ¦                        ¦ ?? QUICK NOTE   [Alt + N]    ¦
 +---------------------------¦                        +------------------------------¦
 ¦  ? App Search Launcher    ¦                        ¦                              ¦
 ¦  ? Google Chrome          ¦   [Alt + N]            ¦ Type quick notes here...     ¦
 ¦  ? VS Code                ¦  ------------?         ¦ Auto-saved to quicknote.txt  ¦
 ¦  ? Windows Terminal       ¦                        ¦                              ¦
 ¦  ? Spotify                ¦                        +------------------------------¦
 ¦  [+] Add App (Explorer)   ¦                        ¦ ? Saved       12 words · 84 c¦
 ¦  ? Power Controls        ¦                        +------------------------------+
 +---------------------------+
```

> **Visual Preview**:
>
> *(Screenshots can be added here once taken)*
>
> | Left Dock & App Launcher | Quick Note Scratchpad (`Alt + N`) |
> | :---: | :---: |
> | ![Sidebar Preview](docs/sidebar-preview.png) | ![Quick Note Preview](docs/quicknote-preview.png) |

---

## ?? System Requirements

| Requirement | Specification |
| :--- | :--- |
| **Operating System** | Windows 10 (Build 19041+) or Windows 11 (64-bit) |
| **Node.js** | Node.js v18.0.0 or higher (v20+ or v24 recommended) |
| **Package Manager** | `npm` (bundled with Node.js) |
| **Hardware** | Any modern multi-core x64 processor, 4 GB+ RAM |

---

## ?? Setup & Installation Guide

### Step 1: Clone or Download the Repository
Clone this repository to your preferred local directory:
```bash
git clone https://github.com/your-username/bjoand-shell.git
cd bjoand-shell
```

### Step 2: Install Dependencies
Install the required Electron runtime and FontAwesome icon set:
```bash
npm install
```

### Step 3: Run the Desktop Shell
You can test and launch the shell immediately using either method:
- **Via Batch File**: Double-click `Bglass-shell.bat`
- **Via Terminal**:
  ```bash
  npm start
  ```

---

## ?? How to Setup Auto-Start on Windows Boot

To have **Bglass-Shell** automatically start in the background when you turn on your PC:

1. Press `Win + R` on your keyboard to open the **Run** dialog.
2. Type `shell:startup` and press **Enter** (this opens your Windows Startup folder).
3. Right-click inside the folder > **New** > **Shortcut**.
4. In the target path, type:
   ```text
   wscript.exe "D:\project\bjoand-shell\Bglass-shell.vbs"
   ```
   *(Replace with the actual path where you placed the project folder).*
5. Name the shortcut `Bglass-Shell` and click **Finish**.

> [!TIP]
> **Why `Bglass-shell.vbs`?**  
> Running `Bglass-shell.vbs` executes Node/Electron silently in the background via Windows Script Host, meaning **zero black CMD console flashes** appear during Windows startup.

---

## ?? Controls & Shortcuts

| Shortcut / Trigger | Action |
| :--- | :--- |
| **`Alt + N`** | Toggle Quick Note window open / closed from anywhere. |
| **Hover Left Screen Edge** | Reveal and expand the glass dock from idle mode. |
| **`Esc`** | Dismiss Quick Note or active search / power panel. |
| **`Win` Key or Click Outside** | Auto-collapse sidebar back into idle mode. |
| **Click `(+)` on Dock** | Open Windows File Explorer to browse and pin any application. |

---

## ?? Project Structure

```text
bjoand-shell/
+-- .gitignore              # Ignores node_modules/ and logs
+-- Bglass-shell.bat        # Manual executable launcher
+-- Bglass-shell.vbs        # Silent background launcher (for Startup)
+-- index.html              # Left sidebar & dock markup
+-- style.css               # Glassmorphism styling, animations & theme
+-- script.js               # Dock controller, app pinning & telemetry
+-- note.html               # Quick Note window interface
+-- note.css                # High-contrast obsidian typography styling
+-- note.js                 # Dual auto-save & word counters logic
+-- quicknote.txt           # Persistent text storage for notes
+-- main.js                 # Electron main process (lifecycle & multi-window)
+-- package.json            # Project manifest & dependencies
+-- package-lock.json       # Exact dependency lockfile
```

---

## ?? License

This project is licensed under the **MIT License** — feel free to use, customize, and modify it for your personal desktop environment.
