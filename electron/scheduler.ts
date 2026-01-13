import { BrowserWindow } from 'electron';
import { RconService } from './rcon';
import { ProcessManager } from './process-manager';
import { logger } from './logger';

export class SchedulerService {
    private rcon: RconService;
    private processManager: ProcessManager;
    private mainWindow: BrowserWindow | null = null;
    
    private restartIntervalMinutes: number = 240; // Default 4 hours
    private nextRestartTime: number = 0;
    private timer: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    // Dynamic Task List (BEC Style)
    // command: 'say -1 msg' or '#lock' or 'custom'
    private tasks: Array<{ minutesBefore: number, command: string }> = [];

    constructor(rcon: RconService, processManager: ProcessManager) {
        this.rcon = rcon;
        this.processManager = processManager;
        
        // Initialize Default BEC-like Schedule
        this.tasks = [
            { minutesBefore: 30, command: 'say -1 RADIO ISLAND: Weather Warning: Severe storm approaching in 30 minutes.' },
            { minutesBefore: 15, command: 'say -1 RADIO ISLAND: Weather Warning: Storm intensity increasing. Seek shelter in 15 minutes.' },
            { minutesBefore: 5, command: 'say -1 RADIO ISLAND: CRITICAL: Storm imminent. Evacuate to safe zone immediately (5 mins).' },
            { minutesBefore: 3, command: 'say -1 RADIO ISLAND: CRITICAL: Safe zones closing in 3 minutes. LOG OUT NOW to save gear.' },
            { minutesBefore: 2, command: 'say -1 RADIO ISLAND: System Alert: Server locking down. Incoming connection paused.' },
            { minutesBefore: 2, command: '#lock' },
            { minutesBefore: 1, command: 'say -1 RADIO ISLAND: IMPACT IMMINENT. Server shutdown in 60 seconds.' }
        ];
    }

    public setMainWindow(win: BrowserWindow) {
        this.mainWindow = win;
    }
    
    public setTasks(tasks: Array<{ minutesBefore: number, command: string }>) {
        this.tasks = tasks;
        logger.log('[Scheduler] Tasks updated:', tasks);
    }

    public start(intervalMinutes: number) {
        this.restartIntervalMinutes = intervalMinutes;
        this.scheduleNextRestart();
        this.isRunning = true;
        
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.tick(), 10000); // Check every 10 seconds
        
        logger.log(`[Scheduler] Started. Next restart in ${intervalMinutes} minutes.`);
        this.broadcastStatus();
    }

    public stop() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.isRunning = false;
        logger.log('[Scheduler] Stopped.');
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
        // Legacy Support: Convert old map to new task list
        const newTasks: Array<{ minutesBefore: number, command: string }> = [];
        
        Object.entries(messages).forEach(([minStr, msg]) => {
            const min = parseInt(minStr);
            newTasks.push({ minutesBefore: min, command: `say -1 RADIO ISLAND: ${msg}` });
            
            // Re-add the lock command if it was implicitly at 2 mins
            if (min === 2) {
                newTasks.push({ minutesBefore: 2, command: '#lock' });
            }
        });
        
        this.tasks = newTasks;
        logger.log('[Scheduler] Legacy messages converted to tasks.');
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
            
            // Find all tasks for this minute
            const tasksToRun = this.tasks.filter(t => t.minutesBefore === minutesRemaining);
            
            if (tasksToRun.length > 0) {
                logger.log(`[Scheduler] Executing ${tasksToRun.length} tasks for T-${minutesRemaining}m`);
            }

            for (const task of tasksToRun) {
                logger.log(`[Scheduler] Running command: ${task.command}`);
                
                if (this.rcon.isConnected()) {
                    await this.rcon.send(task.command);
                } else {
                    logger.warn('[Scheduler] Cannot execute task: RCON is disconnected.');
                }
            }
        }
    }

    private async performRestartSequence() {
        logger.log('[Scheduler] Initiating Restart Sequence...');

        // 0. If server is not running, just start it
        if (!this.processManager.isRunning()) {
            logger.log('[Scheduler] Server not running. Starting immediately...');
            await this.processManager.start();
            this.lastNotifiedMinute = -1;
            return;
        }
        
        // 1. Tell ProcessManager we are planning a shutdown (so it doesn't alert "Crash")
        // And that we EXPECT it to restart automatically.
        this.processManager.setExpectRestart(true);
        
        // 2. Send Shutdown Command
        if (this.rcon.isConnected()) {
             logger.log('[Scheduler] Sending #shutdown...');
             await this.rcon.send('#shutdown');
        } else {
             logger.warn('[Scheduler] RCON not connected during restart. Using Force Kill immediately.');
             // Pass isRestart=true to ensure ProcessManager doesn't cancel the auto-restart
             await this.processManager.stop(true, true); 
             this.lastNotifiedMinute = -1;
             return;
        }

        // 3. Watchdog: Wait 45 seconds for graceful exit
        logger.log('[Scheduler] Waiting for graceful shutdown (45s timeout)...');
        setTimeout(() => {
            if (this.processManager.isRunning()) {
                logger.warn('[Scheduler] Watchdog: Server hung during shutdown. Force killing...');
                this.processManager.forceKill();
            } else {
                logger.log('[Scheduler] Watchdog: Server shutdown successfully.');
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
