# ICE Prioritization Plan (Impact, Confidence, Ease)

Score = Impact (1-10) * Confidence (1-10) * Ease (1-10)

## 1. Core Connectivity & Monitoring (High Priority)
**Feature:** RCON Connection & Server Query (Status/Online)
- **Impact (10):** Fundamental. App is useless without it.
- **Confidence (10):** Standard protocols (Source RCON), well-documented.
- **Ease (8):** Many existing libraries (`gamedig`, `rcon-client`).
- **ICE Score:** 800
- **Action:** Implement first.

## 1.5. Server Mod Integration (Enforce Script) (High Priority)
**Feature:** Custom Server Mod for Telemetry (FPS, Player Pos) & Commands
- **Impact (10):** Unlocks real-time data and advanced admin actions impossible via standard RCON.
- **Confidence (8):** Enforce Script is standard, but RCON bridge requires chat interception workarounds.
- **Ease (5):** Requires C# style scripting and manual JSON serialization.
- **ICE Score:** 400
- **Action:** Implement parallel to Freeze Detection.

## 2. Freeze/Crash Detection (High Priority)
**Feature:** Watchdog for process/connection state
- **Impact (9):** Critical for server reliability (main user pain point).
- **Confidence (8):** Logic is straightforward (ping/timeout), but handling false positives needs care.
- **Ease (7):** Requires robust background worker/polling.
- **ICE Score:** 504
- **Action:** Implement immediately after core connectivity.

## 3. Log Streaming (Medium Priority)
**Feature:** Live Log Viewer
- **Impact (7):** Important for admin tasks.
- **Confidence (7):** Depends on access method (RCON tail vs File read). Remote file read is harder.
- **Ease (6):** Parsing large text streams in real-time can be tricky in UI.
- **ICE Score:** 294
- **Action:** Implement basic RCON console log first, file-based later.

## 4. Analytics & Charts (Medium Priority)
**Feature:** Graphs for restarts, online history
- **Impact (6):** Good for long-term management, less critical for immediate ops.
- **Confidence (9):** Data visualization is standard with AntD Charts.
- **Ease (7):** Needs local database/storage for history (SQLite/JSON).
- **ICE Score:** 378
- **Action:** Implement after stability features.

## 5. Desktop/Webhook Notifications (Low Priority)
**Feature:** Alerts on events
- **Impact (5):** Quality of life.
- **Confidence (10):** Electron notifications are built-in.
- **Ease (9):** Very easy API.
- **ICE Score:** 450
- **Action:** Quick win, can be added early or parallel.

## Implementation Roadmap
1. **Phase 1 (MVP):** Electron Setup + AntD ✅, RCON Connection ✅, Server Status ✅.
2. **Phase 2 (Stability):** 
    - Server Mod Telemetry (FPS/Players) ✅
    - Freeze/Crash Detection + Notifications (Pending).
3. **Phase 3 (Data):** Log Streaming + Analytics Dashboard (ICE: 378, 294).
