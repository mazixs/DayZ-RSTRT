# DayZ-RSTRT Server Mod

This mod provides real-time telemetry (Server FPS, Player Positions, Health) to the DayZ-RSTRT Manager via HTTP (RestApi).

## Installation

### 1. Pack the Mod
You need to pack this folder (`server-mod`) into a `.pbo` file using DayZ Tools (Addon Builder).
1.  Open **DayZ Tools** -> **Addon Builder**.
2.  **Source Directory**: Select the `server-mod` folder in this repository.
3.  **Destination Directory**: Select a temporary folder (e.g., `C:\Temp\RSTRT_Mod`).
4.  **Options**: ensure "Binarize" is checked.
5.  Click **Pack**.

### 2. Install on Server
1.  Copy the generated `.pbo` file (e.g., `RSTRT_Mod.pbo`) to your server's `Run` folder, inside a mod folder structure:
    *   `ServerFolder/@DayZ-RSTRT-Mod/Addons/RSTRT_Mod.pbo`
2.  Copy the `RSTRT_Mod.bisign` key (if you signed it) to the `Keys` folder.

### 3. Server Configuration
1.  Add `@DayZ-RSTRT-Mod` to your `-mod` or `-servermod` startup parameter.
    *   Example: `-servermod=@DayZ-RSTRT-Mod;`
2.  **Enable RestApi**: Ensure your server startup script allows the `RestApi` module. Usually, it is enabled by default, but some hosts require `-dologs` or specific config flags.
3.  **Endpoint Config**: Currently, the mod defaults to sending data to `http://127.0.0.1:3000/api/telemetry`.
    *   If your Manager App is on the SAME machine as the Server, this works automatically.
    *   If separate, you must edit `Scripts/5_Mission/missionServer.c` before packing to point to your Manager's IP.

### 4. Verify Connection
1.  Start DayZ-RSTRT App.
2.  Start DayZ Server.
3.  Watch the App Dashboard. The "Server FPS" widget should light up with real data (not 0) within 10-15 seconds.
