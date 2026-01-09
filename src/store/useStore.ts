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
}

export const useServerStore = create<ServerState>((set) => ({
  isConnected: false,
  playerCount: 0,
  players: [],
  serverName: 'DayZ Server',
  serverFps: 0,
  lastUpdate: 0,
  lastTelemetryUpdate: 0,
  connect: () => set({ isConnected: true }),
  disconnect: () => set({ isConnected: false, playerCount: 0, players: [], serverFps: 0, lastTelemetryUpdate: 0 }),
  updateStatus: (data) => set({ 
    playerCount: data.playerCount, 
    players: data.players,
    lastUpdate: data.timestamp 
  }),
  updateTelemetry: (data) => set((state) => {
    // Merge telemetry data (pos, health) into existing players list
    // Mod 'id' corresponds to RCON 'guid'
    let updatedPlayers = state.players;
    
    if (data.players && Array.isArray(data.players)) {
      const telemMap = new Map(data.players.map((p: any) => [p.id, p]));
      
      updatedPlayers = state.players.map(p => {
        const modData = telemMap.get(p.guid);
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
      serverFps: data.fps,
      playerCount: data.playerCount,
      lastUpdate: data.timestamp,
      lastTelemetryUpdate: Date.now(),
      players: updatedPlayers
    };
  })
}))
