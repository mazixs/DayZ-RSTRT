# PRD: DayZ Server Mod Integration (DayZ-RSTRT)

## 1. Overview
This document defines the architecture for a custom DayZ Server Mod (**Enforce Script**) designed to extend the telemetry and control capabilities of the **DayZ-RSTRT** manager.
The mod acts as a bridge between the Game Engine and the Electron Application, overcoming standard RCON limitations.

## 2. Goals
1.  **High-Fidelity Telemetry**: Retrieve data not available via standard RCON (Server FPS/TickRate, precise player positions, health, gear).
2.  **Advanced Control**: Execute complex logic (e.g., "teleport player X to Y", "heal all") via custom commands.
3.  **Bridge Architecture**: Establish a reliable communication channel between the Server (Enforce) and the Manager (Electron).

## 3. Architecture & Communication

### 3.1 Integration Pattern: HTTP/RestApi (Phase 2 - Preferred)
We will use the DayZ Engine's **RestApi** module to push telemetry directly to the Manager.

*   **Trigger**: Timer-based (every X seconds) or Event-based (PlayerJoin, PlayerHit).
*   **Sender**: The Mod uses `GetRestApi()` to send HTTP POST requests.
*   **Receiver**: The Manager (Electron) hosts a lightweight HTTP server (e.g., Express.js) on a configurable port.
*   **Payload**: Rich JSON data containing FPS, detailed player list, positions, etc.

### 3.2 File Structure
```text
server-mod/
├── config.cpp              # CfgPatches definition
└── Scripts/
    └── 5_Mission/
        └── missionServer.c # Hooks for OnUpdate/Events & RestApi logic
```

## 4. Technical Specifications (Enforce Script)

### 4.1 RestApi Implementation
We will use `RestContext` and `RestCallback` to manage data transmission asynchronously.

```csharp
modded class MissionServer {
    private ref RestContext m_RstrtApi;
    
    override void OnInit() {
        super.OnInit();
        // Initialize connection to local Manager instance
        // URL should be configurable via server profile json
        m_RstrtApi = GetRestApi().GetRestContext("http://127.0.0.1:3000/api/telemetry");
        
        // Start Telemetry Loop
        GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(SendTelemetry, 5000, true);
    }

    void SendTelemetry() {
        if (!m_RstrtApi) return;
        
        // 1. Gather Data (FPS, Players)
        float fps = GetGame().GetFps(); // or GetTickRate()
        
        // 2. Build JSON (Simplified)
        string json = "{\"fps\":" + fps + ", \"players\":[]}"; 
        
        // 3. POST Data
        m_RstrtApi.POST(new RestCallback, "", json);
    }
}
```

### 4.2 Manager Side (Electron)
*   **Component**: `TelemetryServer.ts` (Node.js/Express).
*   **Port**: Configurable (Default 3000).
*   **Security**: Basic Auth token or Localhost whitelist.

## 5. Confidence Assessment & Risks

### 5.1 Confidence Levels
*   **RestApi Availability**: **High**. Standard module in DayZ Server (requires `-dologs` or enabling `RestApi` in server config?). *Verification needed on startup flags.*
*   **Performance**: **High**. HTTP is efficient for text/JSON payloads.
*   **Network Config**: **Medium**.
    *   *Risk:* Users hosting servers remotely (GameHosting) might not be able to POST to their local PC running the Manager without port forwarding or a Relay Server.
    *   *Mitigation:* For local servers (Localhost), it works out of the box. For remote, we might need a "Relay Mode" or public endpoint.

## 6. Implementation Roadmap
1.  **Manager**: Add `express` to Electron Main process.
2.  **Manager**: Create `/api/telemetry` endpoint.
3.  **Mod**: Scaffold `MissionServer` with `GetRestApi()`.
4.  **Testing**: Verify connection `DayZ Server -> Electron`.
