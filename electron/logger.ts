import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class Logger {
    private logPath: string;

    constructor() {
        // Use userData for safe persistent storage
        const logDir = app.getPath('userData');
        this.logPath = path.join(logDir, 'rstrt-debug.log');
        
        // Ensure log exists
        if (!fs.existsSync(this.logPath)) {
            fs.writeFileSync(this.logPath, `[${new Date().toISOString()}] Log Started\n`);
        }
    }

    log(message: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] [INFO] ${message} ${args.map(a => JSON.stringify(a)).join(' ')}\n`;
        this.write(formatted);
        console.log(`[INFO] ${message}`, ...args);
    }

    warn(message: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] [WARN] ${message} ${args.map(a => JSON.stringify(a)).join(' ')}\n`;
        this.write(formatted);
        console.warn(`[WARN] ${message}`, ...args);
    }

    error(message: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] [ERROR] ${message} ${args.map(a => JSON.stringify(a)).join(' ')}\n`;
        this.write(formatted);
        console.error(`[ERROR] ${message}`, ...args);
    }

    private write(line: string) {
        fs.appendFile(this.logPath, line, (err) => {
            if (err) console.error('Failed to write to log file:', err);
        });
    }

    getPath() {
        return this.logPath;
    }
}

export const logger = new Logger();
