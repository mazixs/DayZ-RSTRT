import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

const listeners = new WeakMap<Function, Function>()

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on: (channel: string, listener: Function) => {
    // Wrap the listener to ensure we can control what's passed if needed
    // and to allow 'off' to work by mapping the original listener to this wrapper
    const subscription = (event: IpcRendererEvent, ...args: any[]) => listener(event, ...args)
    listeners.set(listener, subscription)
    ipcRenderer.on(channel, subscription)
  },
  off: (channel: string, listener: Function) => {
    const subscription = listeners.get(listener)
    if (subscription) {
      ipcRenderer.removeListener(channel, subscription as any)
      listeners.delete(listener)
    }
  },
  send: (...args: Parameters<typeof ipcRenderer.send>) => {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke: (...args: Parameters<typeof ipcRenderer.invoke>) => {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})
