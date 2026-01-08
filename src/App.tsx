import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  DesktopOutlined,
  PieChartOutlined,
  FileTextOutlined,
  TeamOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Dashboard from './components/Dashboard';
import PlaceholderPage from './components/PlaceholderPage';
import Settings from './components/Settings';
import { useServerStore } from './store/useStore';

const { Header, Content, Footer, Sider } = Layout;

function App() {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Safely check for mock mode
  const isMock = (window as any).ipcRenderer?.isMock || false;

  const [selectedKey, setSelectedKey] = useState('1');
  const { connect, disconnect, updateStatus, updateTelemetry } = useServerStore();

  useEffect(() => {
    // Check initial status
    const checkStatus = async () => {
      try {
        const status = await window.ipcRenderer.invoke('rcon-status');
        if (status) connect();
        else disconnect();
      } catch (e) {
        console.error('Failed to check RCON status:', e);
      }
    };
    checkStatus();

    // Listen for updates
    const handleUpdate = (_event: any, data: any) => {
      updateStatus(data);
    };

    const handleTelemetry = (_event: any, data: any) => {
      // Data from Mod via HTTP -> Main -> Renderer
      // Format: { fps: number, playerCount: number, ... }
      // Try parsing if string
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        updateTelemetry(parsed);
      } catch (e) {
        console.error('Failed to parse telemetry:', e);
      }
    };

    const handleDisconnect = () => {
      disconnect();
      // Optional: show a notification
      // message.error('RCON Connection Lost'); 
    };

    window.ipcRenderer.on('rcon-update', handleUpdate);
    window.ipcRenderer.on('rcon-disconnected', handleDisconnect);
    window.ipcRenderer.on('telemetry-update', handleTelemetry);

    return () => {
      window.ipcRenderer.off('rcon-update', handleUpdate);
      window.ipcRenderer.off('rcon-disconnected', handleDisconnect);
      window.ipcRenderer.off('telemetry-update', handleTelemetry);
    };
  }, [connect, disconnect, updateStatus, updateTelemetry]);

  const items = [
    { key: '1', icon: <DesktopOutlined />, label: 'Dashboard' },
    { key: '2', icon: <PieChartOutlined />, label: 'Analytics' },
    { key: '3', icon: <TeamOutlined />, label: 'Players' },
    { key: '4', icon: <FileTextOutlined />, label: 'Logs' },
    { key: '5', icon: <SettingOutlined />, label: 'Settings' },
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case '1':
        return <Dashboard />;
      case '2':
        return <PlaceholderPage title="Analytics" />;
      case '3':
        return <PlaceholderPage title="Players" />;
      case '4':
        return <PlaceholderPage title="Logs" />;
      case '5':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
        <Menu 
          theme="dark" 
          defaultSelectedKeys={['1']} 
          mode="inline" 
          items={items} 
          onSelect={({ key }) => setSelectedKey(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isMock && (
            <div style={{ 
              background: '#faad14', 
              color: 'black', 
              padding: '0 12px', 
              borderRadius: 4, 
              fontWeight: 'bold',
              fontSize: 12
            }}>
              BROWSER MOCK MODE (Fake Data)
            </div>
          )}
        </Header>
        <Content style={{ margin: '0 16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              marginTop: 16,
              color: 'white'
            }}
          >
            {renderContent()}
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>DayZ-RSTRT ©2024 Created by mazix</Footer>
      </Layout>
    </Layout>
  );
}

export default App;
