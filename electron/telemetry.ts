import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { BrowserWindow } from 'electron';
import crypto from 'crypto';

export class TelemetryServer {
  private app: express.Application;
  private port: number = 3000;
  private server: any;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  public setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    // Parse ALL other content types as text to handle missing headers from DayZ
    this.app.use(bodyParser.text({ type: '*/*' }));
    this.app.use(bodyParser.urlencoded({ extended: true }));
  }

  private calculateBEGuid(steamId: string): string {
    try {
      // Correct BattlEye GUID Formula: MD5("BE" + 8-byte Little Endian SteamID64)
      // Verified with user data: 76561197996108375 -> 222ac690b634c55bc957aedd9d0e287f
      const prefix = Buffer.from('BE');
      const idBuffer = Buffer.alloc(8);
      idBuffer.writeBigUInt64LE(BigInt(steamId));
      const combined = Buffer.concat([prefix, idBuffer]);
      return crypto.createHash('md5').update(combined).digest('hex');
    } catch (error) {
      console.error('[Telemetry] Error calculating BE GUID:', error);
      return '';
    }
  }

  private setupRoutes() {
    this.app.post('/api/telemetry', (req, res) => {
      try {
        let data = req.body;

        // If body is string (text/plain or missing header), try to parse as JSON
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.warn('[Telemetry] Received raw text that is not JSON:', data.substring(0, 100));
          }
        }

        if (data && typeof data === 'object') {
            // Process players to add BattlEye GUID
            if (Array.isArray(data.players)) {
                data.players = data.players.map((player: any) => {
                    if (player.id) {
                        player.steamId = player.id; // Keep original SteamID
                        player.guid = this.calculateBEGuid(player.id);
                    }
                    return player;
                });
            }

            if (this.mainWindow) {
                this.mainWindow.webContents.send('telemetry-update', data);
            }
        } else {
          console.warn('[Telemetry] Received unknown data format:', data);
        }

        res.status(200).send({ status: 'ok' });
      } catch (error) {
        console.error('[Telemetry] Error processing request:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });
  }

  public start(port?: number) {
    const p = port || this.port;
    this.server = this.app.listen(p, '0.0.0.0', () => {
      console.log(`[Telemetry] Server listening on port ${p}`);
    });
  }

  public stop() {
    if (this.server) {
      this.server.close();
      console.log('[Telemetry] Server stopped');
    }
  }
}
