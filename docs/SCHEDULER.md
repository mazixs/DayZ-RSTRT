# Scheduler System Documentation

## Overview
The Scheduler System in DayZ-RSTRT is designed to replace legacy tools like BEC (BattlEye Extended Controls). It provides a robust, automated mechanism for managing the server lifecycle, including scheduled restarts and timed warnings/commands.

## Functional Requirements

### 1. Server Lifecycle Management
- **Auto-Start**: Automatically start the DayZ Server process if it is not running (configurable).
- **Graceful Shutdown**:
  - Sends `#shutdown` command via RCON for a clean game save and exit.
  - Waits for a configurable timeout (default 45s) for the process to terminate.
  - **Force Kill Watchdog**: If the process hangs during shutdown, force-terminates the process to ensure the restart cycle completes.
- **Crash Detection**:
  - Monitors the server process PID.
  - Detects unexpected exits.
  - Automatically restarts the server if it crashes (unless manually stopped).

### 2. Timed Task Execution (BEC Style)
- **Flexible Schedule**: Tasks are defined by "Minutes Before Restart".
- **Arbitrary Commands**: Supports any valid RCON command, not just chat messages.
  - `say -1 <msg>`: Global chat (BattleEye style).
  - `#lock`: Lock server to prevent new joins.
  - `#unlock`: Unlock server.
  - `#kick (all)`: Kick players.
- **Dynamic Configuration**: Tasks can be added, removed, or modified via the UI without editing config files manually.

### 3. Restart Logic
- **Countdown Timer**: Calculates time remaining based on the configured `Restart Interval`.
- **UI Feedback**: Broadcasts status (Next Restart Time, Is Running) to the Dashboard.
- **Notifications**: Triggers tasks at specific timestamps (T-30m, T-15m, T-1m, etc.).

## Configuration Data Structure
The scheduler configuration is stored in the Electron Store (`schedulerTasks`).

```typescript
interface SchedulerTask {
    minutesBefore: number; // Time trigger (e.g., 10 for 10 minutes before restart)
    command: string;       // RCON command to execute
}

// Default Configuration Example
[
    { minutesBefore: 30, command: 'say -1 RADIO: Restart in 30 minutes.' },
    { minutesBefore: 5, command: 'say -1 RADIO: CRITICAL: Restart in 5 minutes.' },
    { minutesBefore: 2, command: '#lock' }, // Lock server
    { minutesBefore: 0, command: '#shutdown' } // Handled internally by restart sequence, but conceptually here
]
```

## Implementation Details (`scheduler.ts`)

### Tick Loop
- Runs every 10 seconds.
- Checks `Date.now()` against `NextRestartTime`.
- Filters tasks that match `ceil(minutesRemaining)` and executes them.
- Prevents duplicate execution for the same minute using `lastNotifiedMinute` latch.

### Restart Sequence
1.  **Preparation**: Notify `ProcessManager` to expect a restart (suppress crash warnings).
2.  **Shutdown**: Send `#shutdown` via RCON.
3.  **Watchdog**: Start 45s timer.
4.  **Restart**: Once process exits (or is killed), `ProcessManager` triggers the start command again.

## UI Integration
- **Settings Page**: Dedicated "Scheduler" tab.
    - Toggle Enable/Disable.
    - Set Restart Interval (minutes).
    - Add/Remove/Edit tasks.
- **Dashboard**:
    - Displays "Next Restart" countdown.
    - Shows "Restarting..." state during the sequence.
