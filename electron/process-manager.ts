import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import treeKill from 'tree-kill';

export class ProcessManager extends EventEmitter {
    private process: ChildProcess | null = null;
    private isPlannedShutdown: boolean = false;
    private expectRestart: boolean = false;
    private executablePath: string = '';
    private launchArgs: string[] = [];
    private autoRestart: boolean = true;
    private crashCount: number = 0;
    private lastCrashTime: number = 0;

    constructor() {
        super();
    }

    public configure(executablePath: string, args: string[], autoRestart: boolean = true) {
        this.executablePath = executablePath;
        this.launchArgs = args;
        this.autoRestart = autoRestart;
    }

    public setExpectRestart(expect: boolean) {
        this.expectRestart = expect;
    }

    public async start() {
        if (this.process) {
            console.log('[ProcessManager] Server is already running.');
            return;
        }

        if (!this.executablePath) {
            throw new Error('Server executable path not configured.');
        }

        console.log(`[ProcessManager] Starting server: ${this.executablePath} ${this.launchArgs.join(' ')}`);
        
        const cwd = path.dirname(this.executablePath);

        this.process = spawn(this.executablePath, this.launchArgs, {
            cwd: cwd,
            detached: false, 
            stdio: 'ignore' 
        });

        this.isPlannedShutdown = false;
        this.expectRestart = false;
        this.emit('status-change', 'running');

        this.process.on('error', (err) => {
            console.error('[ProcessManager] Failed to start server:', err);
            this.emit('error', err);
            this.process = null;
            this.emit('status-change', 'stopped');
        });

        this.process.on('exit', (code, signal) => {
            console.log(`[ProcessManager] Server exited with code ${code} and signal ${signal}`);
            this.process = null;
            this.emit('status-change', 'stopped');

            if (this.expectRestart) {
                 console.log('[ProcessManager] Planned restart detected. Restarting...');
                 this.expectRestart = false; // Reset
                 setTimeout(() => this.start(), 2000); // Wait a bit before restart
            } else if (!this.isPlannedShutdown) {
                this.handleCrash();
            } else {
                console.log('[ProcessManager] Planned shutdown completed.');
            }
        });
    }

    public async stop(force: boolean = false) {
        if (!this.process) return;

        this.isPlannedShutdown = true;
        this.expectRestart = false; // Explicit stop means no restart
        console.log(`[ProcessManager] Stopping server (Force: ${force})...`);

        if (force) {
            if (this.process.pid) {
                treeKill(this.process.pid, 'SIGKILL');
            }
        } else {
            // Graceful stop is usually handled via RCON #shutdown before calling this
            // But if we need to kill the process from here without RCON:
            if (this.process.pid) {
                treeKill(this.process.pid); // SIGTERM default
            }
        }
    }

    public forceKill() {
        if (this.process && this.process.pid) {
            console.warn('[ProcessManager] Force killing process (Watchdog triggered)...');
            treeKill(this.process.pid, 'SIGKILL');
        }
    }

    private handleCrash() {
        console.warn('[ProcessManager] Unexpected server crash detected!');
        this.emit('crash');

        const now = Date.now();
        if (now - this.lastCrashTime > 60000) {
            this.crashCount = 0; // Reset counter if last crash was > 1 min ago
        }

        this.lastCrashTime = now;
        this.crashCount++;

        if (this.autoRestart && this.crashCount <= 5) {
            console.log(`[ProcessManager] Auto-restarting in 5 seconds... (Attempt ${this.crashCount}/5)`);
            setTimeout(() => {
                this.start();
            }, 5000);
        } else {
            console.error('[ProcessManager] Max crash limit reached or auto-restart disabled. Server stays offline.');
            this.emit('error', new Error('Max crash limit reached'));
        }
    }

    public isRunning(): boolean {
        return this.process !== null;
    }
}
