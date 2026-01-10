import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Typography, message } from 'antd';
import {
  DesktopOutlined,
  PieChartOutlined,
  FileTextOutlined,
  TeamOutlined,
  SettingOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import Dashboard from './components/Dashboard';
import ProcessManager from './components/ProcessManager';
import PlaceholderPage from './components/PlaceholderPage';
import Settings from './components/Settings';
import { useServerStore } from './store/useStore';

const { Header, Content, Footer, Sider } = Layout;
const { Text } = Typography;

function App() {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Safely check for mock mode
  const isMock = (window as any).ipcRenderer?.isMock || false;

  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('1');
  const { connect, disconnect, updateStatus, updateTelemetry, setProcessStatus, setSchedulerStatus } = useServerStore();

  useEffect(() => {
    // Check initial status
    const checkStatus = async () => {
      try {
        const status = await window.ipcRenderer.invoke('rcon-status');
        if (status) connect();
        else disconnect();

        const procStatus = await window.ipcRenderer.invoke('process-status');
        setProcessStatus(procStatus);

        const schedStatus = await window.ipcRenderer.invoke('scheduler-status');
        setSchedulerStatus(schedStatus);
      } catch (e) {
        console.error('Failed to check status:', e);
      }
    };
    checkStatus();

    // Listen for updates
    const handleUpdate = (_event: any, data: any) => {
      updateStatus(data);
    };

    const handleTelemetry = (_event: any, data: any) => {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        updateTelemetry(parsed);
      } catch (e) {
        console.error('Failed to parse telemetry:', e);
      }
    };

    const handleDisconnect = () => {
      disconnect();
    };

    const handleProcessStatus = (_event: any, status: string) => {
        setProcessStatus(status === 'running');
    };

    const handleSchedulerStatus = (_event: any, status: any) => {
        setSchedulerStatus(status);
    };

    window.ipcRenderer.on('rcon-update', handleUpdate);
    window.ipcRenderer.on('rcon-disconnected', handleDisconnect);
    window.ipcRenderer.on('telemetry-update', handleTelemetry);
    window.ipcRenderer.on('process-status-change', handleProcessStatus);
    window.ipcRenderer.on('scheduler-status', handleSchedulerStatus);

    return () => {
      window.ipcRenderer.off('rcon-update', handleUpdate);
      window.ipcRenderer.off('rcon-disconnected', handleDisconnect);
      window.ipcRenderer.off('telemetry-update', handleTelemetry);
      window.ipcRenderer.off('process-status-change', handleProcessStatus);
      window.ipcRenderer.off('scheduler-status', handleSchedulerStatus);
    };
  }, [connect, disconnect, updateStatus, updateTelemetry, setProcessStatus, setSchedulerStatus]);

  const items = [
    { key: '1', icon: <DesktopOutlined />, label: 'Dashboard' },
    { key: 'process', icon: <PlayCircleOutlined />, label: 'Process Manager' },
    { key: '2', icon: <PieChartOutlined />, label: 'Analytics' },
    { key: '3', icon: <TeamOutlined />, label: 'Players' },
    { key: '4', icon: <FileTextOutlined />, label: 'Logs' },
    { key: '5', icon: <SettingOutlined />, label: 'Settings' },
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case '1':
        return <Dashboard />;
      case 'process':
        return <ProcessManager />;
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
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} width={220}>
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
        <Footer style={{ textAlign: 'center' }}>DayZ-RSTRT ©2026 Created by mazix</Footer>
      </Layout>
    </Layout>
  );
}

export default App;
