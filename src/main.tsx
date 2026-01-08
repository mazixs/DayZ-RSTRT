import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import App from './App'
import './index.css'
import { mockIpcRenderer } from './mock/ipc'

// Mock IPC for browser development
if (!window.ipcRenderer) {
  console.log('Using Mock IPC')
  window.ipcRenderer = mockIpcRenderer;
} else {
  console.log('Using Real IPC')
}

try {
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  root.render(
    <React.StrictMode>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#fa541c', // Volcano orange (DayZ vibe)
            colorBgContainer: '#1f1f1f',
            colorBgLayout: '#000000', // Darker layout background
          },
          components: {
            Layout: {
              siderBg: '#050505', // Neutral dark sidebar (no blue)
              triggerBg: '#1f1f1f',
              bodyBg: '#000000',
              headerBg: '#050505',
            },
            Menu: {
              darkItemBg: '#050505', // Match sider
              darkSubMenuItemBg: '#050505',
              itemBg: '#050505',
            }
          }
        }}
      >
        <App />
      </ConfigProvider>
    </React.StrictMode>,
  )
  console.log('React mounted')
} catch (e) {
  console.error('React mount error:', e)
  document.body.innerHTML = `<div style="color:red; padding: 20px;"><h1>Render Error</h1><pre>${e}</pre></div>`
}

// Remove Preload scripts loading
postMessage({ payload: 'removeLoading' }, '*')
