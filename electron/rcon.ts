// @ts-ignore
import BattleNode from 'battle-node-v2'

export class RconService {
  private client: any | null = null
  private config: any = null
  private connected: boolean = false
  private consecutiveFailures: number = 0
  private readonly MAX_FAILURES = 3

  constructor() {}

  async connect(config: { host: string; port: number; password: string }) {
    if (this.client) {
      await this.disconnect()
    }

    this.config = config
    this.consecutiveFailures = 0
    console.log(`Connecting to ${config.host}:${config.port}...`)

    try {
      this.client = new BattleNode({
        ip: config.host,
        port: config.port,
        rconPassword: config.password,
        timeout: 5000
      })

      await this.client.login()
      this.connected = true
      console.log('RCON Connected successfully')
      return true
    } catch (error) {
      console.error('Failed to connect RCON:', error)
      this.connected = false
      throw error
    }
  }

  async disconnect() {
    // BattleNode v2 doesn't expose a clean disconnect method in public API
    // but we can just release the instance since it's UDP based mostly.
    this.client = null
    this.connected = false
  }

  async send(command: string) {
    if (!this.client || !this.connected) {
      throw new Error('RCON not connected')
    }
    return await this.client.sendCommand(command)
  }

  async getPlayers() {
    if (!this.client || !this.connected) return []
    try {
      const response = await this.client.sendCommand('players')
      if (!response) return []
      
      const lines = response.split('\n')
      const players: any[] = []
      
      // Regex for BattlEye players output (relaxed):
      // 0   127.0.0.1:2304   0   beGuid(OK)   Name
      // Groups: 1=ID, 2=IP, 3=Ping, 4=GUID, 5=Name
      const regex = /^(\d+)\s+([\d\.]+:\d+)\s+(\-?\d+)\s+([a-fA-F0-9]+)(?:\(.*\))?\s+(.+)$/

      for (const line of lines) {
        const trimmed = line.trim()
        // Skip header lines
        if (trimmed.startsWith('Players on server') || trimmed.startsWith('#') || trimmed.startsWith('ID')) continue;

        const match = trimmed.match(regex)
        if (match) {
          players.push({
            id: match[1],
            ip: match[2],
            ping: parseInt(match[3]),
            guid: match[4],
            name: match[5].trim()
          })
        }
      }
      return players
    } catch (e) {
      console.error('Failed to get players:', e)
      return []
    }
  }

  isConnected() {
    return this.connected
  }
}
