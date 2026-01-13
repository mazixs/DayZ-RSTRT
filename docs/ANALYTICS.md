# Analytics & Statistics System Documentation

## Overview
The Analytics module is designed to provide server administrators with long-term insights into server performance, player engagement, and stability. Unlike the real-time Dashboard, Analytics focuses on historical data to help identify trends, diagnose performance issues, and track community growth.

## Functional Requirements

### 1. Data Collection & Storage
- **Time-Series Data**:
  - The system must periodically (e.g., every 1-5 minutes) snapshot key metrics.
  - **Storage**: Local embedded database (e.g., SQLite or LowDB) to handle historical data efficiently without external dependencies.
  - **Retention Policy**: Configurable data retention (default: 30 days for detailed logs, 1 year for aggregated stats) to manage disk space.

### 2. Key Metrics Categories

#### A. Server Performance (Technical Health)
*Goal: Identify lag spikes and resource bottlenecks.*
- **Server FPS History**: Line graph showing Server FPS over time.
  - *Correlation*: Overlay with Player Count to see if FPS drops are caused by load.
- **Resource Usage** (Proposed):
  - **CPU Usage**: % of CPU core used by the server process.
  - **RAM Usage**: Memory footprint of the process.
- **Network Quality**:
  - **Average Ping**: Global average latency of all connected players.

#### B. Population Dynamics (Community Health)
*Goal: Understand player traffic patterns.*
- **Concurrent Players (CCU)**:
  - Timeline graph (24h / 7 Days / 30 Days).
  - **Peak Online**: Highlight the highest player count per day.
- **Unique Visitors**:
  - **DAU (Daily Active Users)**: Count of unique GUIDs seen in a 24h period.
  - **MAU (Monthly Active Users)**: Count of unique GUIDs seen in a 30-day period.
  - **New Players**: Count of GUIDs never seen before.

#### C. Retention & Engagement (Advanced)
*Goal: Measure long-term player loyalty and churn.*
- **Retention Rate (Cohorts)**:
  - **D1 Retention**: % of new players who return exactly 1 day after their first join.
  - **D7 Retention**: % of new players who return 7 days later (indicator of weekly habit).
  - **D30 Retention**: % of new players who return 30 days later (long-term core).
- **Churn Rate**:
  - Percentage of active players who have not logged in for > 14 or 30 days.
- **Session Length**:
  - **Average Session**: Total playtime / Total sessions.
  - **Median Session**: "Typical" playtime (filters out AFK outliers).
  - **Sessions per User**: Average number of logins per day/week.

#### D. Playtime & History
*Goal: Identify most active players and individual habits.*
- **Playtime Leaderboard**:
  - Top 10/50 players by total hours played (Cumulative).
- **Player Search/History**:
  - Look up a specific SteamID/Name to see their total playtime, last login, and number of connections.

#### E. Stability & Reliability
*Goal: Track server uptime and crash frequency.*
- **Uptime**: Percentage of time the server was in "Running" and "RCON Connected" state.
- **Incident Log**:
  - Timeline of Restarts (Planned vs Crashes).
  - Count of "Freeze" events detected.

## UI/UX Design Proposals

### "Analytics" Tab
1.  **Overview Cards** (Top Row):
    - Peak Players (Today)
    - Average FPS (Last 24h)
    - New Players (Today)
    - Server Uptime (7 Days)
2.  **Main Graphs**:
    - **Performance Chart**: Dual-axis line chart (Left: FPS, Right: Player Count) over time.
    - **Traffic Chart**: Bar chart of Unique Players per day for the last 30 days.
3.  **Tables**:
    - "Top Survivors" (Playtime Leaderboard).
    - "Recent Incidents" (Crashes/Restarts).

## Technical Implementation Plan
1.  **Database**: Integrate `better-sqlite3` (Synchronous, High-Performance) for storing timeseries data and player records.
    - **Schema**:
      - `players` (guid PRIMARY KEY, names, first_seen, last_seen, total_playtime, sessions_count)
      - `sessions` (id, player_guid, start_time, end_time)
      - `server_stats` (timestamp, fps, cpu_usage, ram_usage, player_count)
2.  **Collector Service**: A background background loop in `main.ts` that:
    - Runs every 60 seconds.
    - Gathers: `rcon.getPlayers().length`, `store.serverFps`, `process.memoryUsage`.
    - Writes to DB.
3.  **Aggregator**: Helper functions to calculate Daily/Weekly averages from raw data.
