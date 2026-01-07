# Product Requirements Document (PRD): DayZ Server Manager (DayZ-RSTRT)

## 1. Overview
A cross-platform desktop application (Windows/Linux) for managing DayZ servers. It provides real-time monitoring, RCON control, analytics, and automated health checks (freeze/crash detection).

## 2. Core Features

### 2.1 Server Monitoring
- **Real-time Status:** Online/Offline state, Player count, Server FPS (if available via RCON/logs).
- **Log Stream:** Live view of server logs (ADM, RPT) via RCON or file system (SFTP/Local).
- **Player Management:** List online players, kick/ban functionality.

### 2.2 RCON Management
- **Connection:** Support for local and remote RCON connections.
- **Console:** Terminal-like interface for sending raw commands.
- **Shortcuts:** Quick buttons for common commands (Global Chat, Weather, Time).

### 2.3 Analytics & Reporting
- **Charts:**
  - Uptime/Downtime history.
  - Player activity peaks.
  - Restart frequency.
- **Visuals:** Use Ant Design Charts / Recharts.

### 2.4 Automation & Health
- **Freeze Detection:** Monitor server heartbeat/response time. If unresponsive > X seconds, trigger alert/action.
- **Crash Detection:** Detect abrupt process termination (if local) or connection loss (remote).
- **Alerts:** Desktop notifications and optional Webhook support (Discord/Telegram) for events (Crash, Restart, High CPU).

## 3. UX/UI Requirements
- **Framework:** React + Electron.
- **Design System:** Ant Design (AntD).
- **Theme:** Dark mode by default (gaming aesthetic).
- **Layout:**
  - Sidebar navigation (Dashboard, Console, Players, Logs, Settings).
  - Dashboard with "Monitor Dashboard" style gauges (AntD Progress dashboard type).

## 4. Technical Stack
- **Runtime:** Electron (Main + Renderer processes).
- **Frontend:** React, TypeScript, Vite.
- **UI Library:** Ant Design.
- **State Management:** Zustand or TanStack Query.
- **Data Persistence:** Electron Store (local config).
- **Networking:** `node-rcon` or specific DayZ RCON libs, `gamedig` for querying.

## 5. Non-Functional Requirements
- **Performance:** Low CPU/RAM usage in background.
- **Security:** Encrypted storage for RCON passwords.
- **Cross-Platform:** Builds for .exe (Windows) and .deb/.AppImage (Linux).
