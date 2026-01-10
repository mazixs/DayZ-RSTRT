import { create } from 'zustand'

interface Player {
  id: string
  name: string
  guid: string
  ip: string
  ping: number
  pos?: string
  health?: number
}

interface ServerState {
  isConnected: boolean
  playerCount: number
  players: Player[]
  serverName: string
  serverFps: number
  lastUpdate: number
  lastTelemetryUpdate: number
  connect: () => void
  disconnect: () => void
  updateStatus: (data: { playerCount: number; players: Player[]; timestamp: number }) => void
  updateTelemetry: (data: { fps: number; playerCount: number; players?: any[]; timestamp: number }) => void
  
  // Process & Scheduler State
  isProcessRunning: boolean
  scheduler: {
    isRunning: boolean
    nextRestartTime: number
    intervalMinutes: number
  }
  setProcessStatus: (isRunning: boolean) => void
  setSchedulerStatus: (status: { isRunning: boolean; nextRestartTime: number; intervalMinutes: number }) => void
}

export const useServerStore = create<ServerState>((set) => ({
  isConnected: false,
  playerCount: 0,
  players: [],
  serverName: 'DayZ Server',
  serverFps: 0,
  lastUpdate: 0,
  lastTelemetryUpdate: 0,
  
  isProcessRunning: false,
  scheduler: {
    isRunning: false,
    nextRestartTime: 0,
    intervalMinutes: 240
  },

  connect: () => set({ isConnected: true }),
  disconnect: () => set({ isConnected: false, playerCount: 0, players: [], serverFps: 0, lastTelemetryUpdate: 0 }),
  
  setProcessStatus: (isRunning) => set({ isProcessRunning: isRunning }),
  setSchedulerStatus: (status) => set({ scheduler: status }),

  updateStatus: (data) => set((state) => {
    // RCON update: Preserve telemetry data (pos, health) if it exists
    const existingPlayersMap = new Map(state.players.map(p => [p.guid.toLowerCase(), p]));
    const existingNamesMap = new Map(state.players.map(p => [p.name.toLowerCase(), p]));
    
    const mergedPlayers = data.players.map(rconPlayer => {
      // Try matching by GUID first
      let existing = existingPlayersMap.get(rconPlayer.guid.toLowerCase());
      
      // Fallback: Match by Name if GUID match fails (handles Mod ID vs RCON ID mismatch)
      if (!existing && rconPlayer.name) {
         existing = existingNamesMap.get(rconPlayer.name.toLowerCase());
         if (existing) {
             console.log('[Store] Merged RCON player by Name:', rconPlayer.name);
         }
      }

      if (existing) {
        return {
          ...rconPlayer,
          pos: existing.pos,
          health: existing.health
        };
      }
      return rconPlayer;
    });

    return {
      isConnected: true,
      playerCount: data.playerCount,
      players: mergedPlayers,
      lastUpdate: data.timestamp
    };
  }),
  updateTelemetry: (data) => set((state) => {
    const telemPlayers = data.players || [];
    let updatedPlayers: Player[] = [];

    if (state.players.length === 0 && telemPlayers.length > 0) {
      // RCON offline: Create players from Telemetry
      updatedPlayers = telemPlayers.map((p: any) => ({
        id: p.id,
        guid: p.guid || p.id, // Use calculated BE GUID if available
        name: p.name,
        ip: 'Unknown',
        ping: 0,
        pos: p.pos,
        health: p.health
      }));
    } else {
      // RCON online: Merge telemetry into existing list
      const telemMap = new Map(telemPlayers.map((p: any) => [(p.guid || p.id).toLowerCase(), p]));
      const telemNameMap = new Map(telemPlayers.map((p: any) => [p.name.toLowerCase(), p]));
      
      updatedPlayers = state.players.map(p => {
        // Try matching by GUID (Mod ID) first
        let modData = telemMap.get(p.guid.toLowerCase());
        
        // Fallback: Match by Name
        if (!modData && p.name) {
            modData = telemNameMap.get(p.name.toLowerCase());
        }

        if (modData) {
          return { 
            ...p, 
            pos: modData.pos, 
            health: modData.health 
          };
        }
        return p;
      });
    }

    return {
      isConnected: true,
      serverFps: data.fps,
      playerCount: data.playerCount,
      lastUpdate: data.timestamp,
      lastTelemetryUpdate: Date.now(),
      players: updatedPlayers
    };
  })
}))
