import { BrowserWindow } from 'electron';
import { RconService } from './rcon';
import { ProcessManager } from './process-manager';

export class SchedulerService {
    private rcon: RconService;
    private processManager: ProcessManager;
    private mainWindow: BrowserWindow | null = null;
    
    private restartIntervalMinutes: number = 240; // Default 4 hours
    private nextRestartTime: number = 0;
    private timer: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    // Immersion messages (Minutes Remaining -> Message)
    private messages: Record<number, string> = {
        30: "Weather Warning: Severe storm approaching in 30 minutes.",
        15: "Weather Warning: Storm intensity increasing. Seek shelter in 15 minutes.",
        5: "CRITICAL: Storm imminent. Evacuate to safe zone immediately (5 mins).",
        3: "CRITICAL: Safe zones closing in 3 minutes. LOG OUT NOW to save gear.",
        2: "System Alert: Server locking down. Incoming connection paused.",
        1: "IMPACT IMMINENT. Server shutdown in 60 seconds."
    };

    constructor(rcon: RconService, processManager: ProcessManager) {
        this.rcon = rcon;
        this.processManager = processManager;
    }

    public setMainWindow(win: BrowserWindow) {
        this.mainWindow = win;
    }

    public start(intervalMinutes: number) {
        this.restartIntervalMinutes = intervalMinutes;
        this.scheduleNextRestart();
        this.isRunning = true;
        
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.tick(), 10000); // Check every 10 seconds
        
        console.log(`[Scheduler] Started. Next restart in ${intervalMinutes} minutes.`);
        this.broadcastStatus();
    }

    public stop() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.isRunning = false;
        console.log('[Scheduler] Stopped.');
        this.broadcastStatus();
    }

    public getStatus() {
        return {
            isRunning: this.isRunning,
            nextRestartTime: this.nextRestartTime,
            intervalMinutes: this.restartIntervalMinutes
        };
    }

    public setMessages(messages: Record<number, string>) {
        this.messages = messages;
    }

    private scheduleNextRestart() {
        this.nextRestartTime = Date.now() + (this.restartIntervalMinutes * 60 * 1000);
        this.broadcastStatus();
    }

    private async tick() {
        if (!this.isRunning) return;

        const now = Date.now();
        const msRemaining = this.nextRestartTime - now;
        const minutesRemaining = Math.ceil(msRemaining / 60000);

        if (msRemaining <= 0) {
            // TIME TO RESTART
            await this.performRestartSequence();
            // Schedule next one
            this.scheduleNextRestart();
        } else {
            // Check for notifications
            this.checkNotifications(minutesRemaining);
        }
    }

    // Helper to track last notified minute to avoid spam
    private lastNotifiedMinute: number = -1;

    private async checkNotifications(minutesRemaining: number) {
        if (minutesRemaining !== this.lastNotifiedMinute) {
            this.lastNotifiedMinute = minutesRemaining;
            
            if (this.messages[minutesRemaining]) {
                const msg = this.messages[minutesRemaining];
                console.log(`[Scheduler] Sending notification: ${msg}`);
                
                if (this.rcon.isConnected()) {
                    await this.rcon.send(`say -1 RADIO ISLAND: ${msg}`);
                } else {
                    console.warn('[Scheduler] Cannot send notification: RCON is disconnected.');
                }
            }

            // Special Actions
            if (minutesRemaining === 2) {
                // LOCK SERVER
                if (this.rcon.isConnected()) {
                    console.log('[Scheduler] Locking server...');
                    await this.rcon.send('#lock');
                }
            }
        }
    }

    private async performRestartSequence() {
        console.log('[Scheduler] Initiating Restart Sequence...');

        // 0. If server is not running, just start it
        if (!this.processManager.isRunning()) {
            console.log('[Scheduler] Server not running. Starting immediately...');
            await this.processManager.start();
            this.lastNotifiedMinute = -1;
            return;
        }
        
        // 1. Tell ProcessManager we are planning a shutdown (so it doesn't alert "Crash")
        // And that we EXPECT it to restart automatically.
        this.processManager.setExpectRestart(true);
        
        // 2. Send Shutdown Command
        if (this.rcon.isConnected()) {
             console.log('[Scheduler] Sending #shutdown...');
             await this.rcon.send('#shutdown');
        } else {
             console.warn('[Scheduler] RCON not connected during restart. Using Force Kill immediately.');
             // Pass isRestart=true to ensure ProcessManager doesn't cancel the auto-restart
             await this.processManager.stop(true, true); 
             this.lastNotifiedMinute = -1;
             return;
        }

        // 3. Watchdog: Wait 45 seconds for graceful exit
        console.log('[Scheduler] Waiting for graceful shutdown (45s timeout)...');
        setTimeout(() => {
            if (this.processManager.isRunning()) {
                console.warn('[Scheduler] Watchdog: Server hung during shutdown. Force killing...');
                this.processManager.forceKill();
            } else {
                console.log('[Scheduler] Watchdog: Server shutdown successfully.');
            }
        }, 45000);

        // Reset notification state
        this.lastNotifiedMinute = -1;
    }

    private broadcastStatus() {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('scheduler-status', this.getStatus());
        }
    }
}
