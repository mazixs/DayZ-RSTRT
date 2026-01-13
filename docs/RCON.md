# RCON System Documentation

## Overview
The RCON (Remote Console) system serves as the control plane for the DayZ Server. It utilizes the BattlEye RCON protocol to send commands, receive chat messages, and manage players. DayZ-RSTRT implements a robust RCON client that handles connection instability and command queueing.

## Functional Features

### 1. Connection Management
- **Auto-Reconnect**: Automatically attempts to reconnect if the connection is dropped (e.g., server restart, network blip).
- **State Tracking**: Exposes `isConnected` state to the UI to show "Online/Offline" status.
- **Authentication**: Supports standard BE authentication (IP, Port, Password).

### 2. Command Execution
- **Mutex / Queue**: Prevents "packet flooding" by serializing commands. Ensures that a command response is received (or timed out) before sending the next one.
- **Safe Execution**: Wraps all calls in try/catch blocks to prevent app crashes on socket errors.
- **Type Safety**: Strictly types return values (e.g., ensuring string responses for text commands).

### 3. Player Management
- **Polling Strategy**:
    - **Heartbeat**: Fetches player list (`players` command) every 30-60 seconds to keep data in sync.
    - **Event-Driven**: Listens for BE "Player Connected" / "Player Disconnected" packets to trigger immediate updates.
- **Data Parsing**:
    - Parses the raw text output of the `players` command.
    - Extracts: ID (Index), IP, Port, Ping, GUID (BE GUID), Name.
    - Note: In-game Health and Position are **NOT** available via standard RCON. These are merged from the Telemetry Mod system.

### 4. Admin Actions
- **Global Chat**: `say -1 <message>`
- **Kick/Ban**: Supported via standard BE commands (future UI implementation).
- **Lock/Unlock**: Used by Scheduler to manage server entry.
- **Shutdown**: Graceful server termination.

## Implementation Details (`rcon.ts`)

### Key Classes
- `RconService`: Main wrapper around the `battle-node-v2` library.
    - `connect(config)`
    - `disconnect()`
    - `send(command)`
    - `getPlayers()`

### Error Handling
- **"Connection Lagging"**: If the RCON socket is open but `players` command hasn't returned successfully in > 45 seconds, the UI flags the connection as "Stale/Lagging".
- **Socket/Packet Errors**: Logged to `%APPDATA%\dayz-rstrt\rstrt-debug.log`.

## Limitations
- **Protocol Limits**: The BE RCON protocol is UDP-based and can be unreliable with large packet sizes (though DayZ implementation is generally TCP).
- **Data Limits**: RCON does not provide detailed player stats (Health, Position, Inventory). This is why DayZ-RSTRT uses a hybrid **RCON + Telemetry (HTTP)** architecture.
