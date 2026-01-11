// @ts-ignore
import BattleNode from 'battle-node-v2'

export class RconService {
  private client: any | null = null
  private config: any = null
  private connected: boolean = false
  private consecutiveFailures: number = 0
  private readonly MAX_FAILURES = 3
  
  // Command Queue System
  private queue: Array<{ 
      operation: () => Promise<any>, 
      resolve: (value: any) => void, 
      reject: (reason?: any) => void 
  }> = [];
  private isProcessing: boolean = false;

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
    
    // Simple Mutex: Append to promise chain
    const result = await this.executeSafe(() => this.client.sendCommand(command));
    return result;
  }

  async getPlayers() {
    if (!this.client || !this.connected) return []
    try {
      const response = await this.executeSafe(() => this.client.sendCommand('players'));
      if (!response) return []
      
      console.log('[RCON DEBUG] Raw Players Output:\n', response); // DEBUG: Print exact output

      const lines = (response as string).split('\n')
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

  // Helper to serialize commands via Queue
  private async executeSafe<T>(operation: () => Promise<T>): Promise<T> {
      return new Promise((resolve, reject) => {
          this.queue.push({ operation, resolve, reject });
          this.processQueue();
      });
  }

  private async processQueue() {
      if (this.isProcessing || this.queue.length === 0) return;

      this.isProcessing = true;
      const item = this.queue.shift();

      if (item) {
          try {
              // Wrap operation in a timeout to prevent infinite hangs
              const result = await Promise.race([
                  item.operation(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('RCON Command Timeout')), 5000))
              ]);
              
              // Success - reset failures
              this.consecutiveFailures = 0;
              item.resolve(result);
          } catch (error) {
              console.error('[RCON] Command failed:', error);
              this.consecutiveFailures++;
              
              if (this.consecutiveFailures >= this.MAX_FAILURES) {
                  console.error('[RCON] Max consecutive failures reached. Disconnecting...');
                  this.connected = false;
                  this.client = null; // Force reset
              }
              
              item.reject(error);
          } finally {
              this.isProcessing = false;
              // Add a small delay between commands to let RCON server breathe
              setTimeout(() => this.processQueue(), 100);
          }
      } else {
          this.isProcessing = false;
      }
  }

  isConnected() {
    return this.connected
  }
}
