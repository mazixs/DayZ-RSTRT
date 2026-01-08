const listeners = new Map<Function, NodeJS.Timeout>();

export const mockIpcRenderer = {
  isMock: true,
  invoke: async (channel: string, ...args: any[]) => {
    console.log(`[Mock IPC] invoke: ${channel}`, args);
    switch (channel) {
      case 'get-settings':
        return {
          rconHost: '',
          rconPort: 2302,
          rconPassword: ''
        };
      case 'rcon-status':
        return true; // Mock connected status
      case 'rcon-connect':
        return true;
      case 'rcon-disconnect':
        return true;
      case 'save-settings':
        return true;
      default:
        return null;
    }
  },
  on: (channel: string, func: (...args: any[]) => void) => {
    console.log(`[Mock IPC] on: ${channel}`);
    if (channel === 'rcon-update') {
      // Simulate periodic updates
      const interval = setInterval(() => {
        func(null, {
          playerCount: 2,
          players: [
            { id: '1', name: 'Survivor', guid: 'abc12345', ip: '192.168.1.10', ping: 45 },
            { id: '2', name: 'Bandit', guid: 'def67890', ip: '192.168.1.11', ping: 120 }
          ],
          timestamp: Date.now()
        });
      }, 5000);
      listeners.set(func, interval);
    }
  },
  off: (channel: string, func: (...args: any[]) => void) => {
    console.log(`[Mock IPC] off: ${channel}`);
    if (listeners.has(func)) {
      const interval = listeners.get(func);
      if (interval) clearInterval(interval);
      listeners.delete(func);
    }
  },
  send: (channel: string, ...args: any[]) => {
    console.log(`[Mock IPC] send: ${channel}`, args);
  }
};
