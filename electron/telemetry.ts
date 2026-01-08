import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { BrowserWindow } from 'electron';

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
    // Parse text as JSON just in case Enforce Script sends weird content types
    this.app.use(bodyParser.text({ type: 'application/json' }));
  }

  private setupRoutes() {
    this.app.post('/api/telemetry', (req, res) => {
      try {
        const data = req.body;
        console.log('[Telemetry] Received data:', data);

        if (this.mainWindow) {
          this.mainWindow.webContents.send('telemetry-update', data);
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
