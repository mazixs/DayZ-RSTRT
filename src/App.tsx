import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Button, Space, Typography, Tag, Tooltip, Popconfirm, message } from 'antd';
import {
  DesktopOutlined,
  PieChartOutlined,
  FileTextOutlined,
  TeamOutlined,
  SettingOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  ApiOutlined,
  DisconnectOutlined,
  StopOutlined
} from '@ant-design/icons';
import Dashboard from './components/Dashboard';
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

  const [selectedKey, setSelectedKey] = useState('1');
  const { isConnected, isProcessRunning, connect, disconnect, updateStatus, updateTelemetry, setProcessStatus, setSchedulerStatus } = useServerStore();

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

  const handleStart = async () => {
    try {
        const settings = await window.ipcRenderer.invoke('get-settings');
        if (!settings.serverPath) {
            message.error('Server path not configured in Settings');
            return;
        }
        await window.ipcRenderer.invoke('process-start', {
            executablePath: settings.serverPath,
            args: settings.launchArgs || [],
            autoRestart: settings.autoRestart ?? true
        });
        message.success('Server start command sent');
    } catch (e: any) {
        message.error('Failed to start server: ' + e.message);
    }
  };

  const handleStop = async () => {
      try {
          await window.ipcRenderer.invoke('process-stop', false);
          message.info('Stop command sent');
      } catch (e: any) {
          message.error('Failed to stop: ' + e.message);
      }
  };

  const handleRestart = async () => {
      try {
          await window.ipcRenderer.invoke('process-stop', false);
          message.loading({ content: 'Restarting...', key: 'restart' });
          setTimeout(async () => {
             await handleStart();
             message.success({ content: 'Restart command sent', key: 'restart' });
          }, 3000);
      } catch (e: any) {
          message.error('Restart failed: ' + e.message);
      }
  };

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
      <Sider collapsible width={220} style={{ position: 'relative' }}>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
        <Menu 
          theme="dark" 
          defaultSelectedKeys={['1']} 
          mode="inline" 
          items={items} 
          onSelect={({ key }) => setSelectedKey(key)}
          style={{ paddingBottom: 150 }} // Space for footer
        />
        
        {/* Fixed Footer Controls in Sidebar */}
        <div style={{ 
            position: 'absolute', 
            bottom: 0, 
            width: '100%', 
            padding: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            background: '#001529' // Match Sidebar bg
        }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* RCON Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Space size={4}>
                        <ApiOutlined style={{ color: isConnected ? '#52c41a' : '#ff4d4f' }} />
                        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>RCON:</Text>
                    </Space>
                    <Tag color={isConnected ? 'success' : 'error'} style={{ margin: 0, fontSize: 10 }}>
                        {isConnected ? 'ONLINE' : 'OFFLINE'}
                    </Tag>
                </div>

                {/* Server Status */}
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Space size={4}>
                        <DesktopOutlined style={{ color: isProcessRunning ? '#52c41a' : '#8c8c8c' }} />
                        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>PROCESS:</Text>
                    </Space>
                     <Tag color={isProcessRunning ? 'processing' : 'default'} style={{ margin: 0, fontSize: 10 }}>
                        {isProcessRunning ? 'RUNNING' : 'STOPPED'}
                    </Tag>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 8 }}>
                    {!isProcessRunning ? (
                         <Tooltip title="Start Server">
                            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={handleStart} block ghost>Start</Button>
                        </Tooltip>
                    ) : (
                        <Popconfirm title="Stop Server?" onConfirm={handleStop} okText="Yes" cancelText="No">
                            <Button danger size="small" icon={<StopOutlined />} block ghost>Stop</Button>
                        </Popconfirm>
                    )}
                    
                    <Popconfirm title="Restart Server?" onConfirm={handleRestart} okText="Yes" cancelText="No">
                        <Tooltip title="Restart">
                            <Button type="dashed" size="small" icon={<ReloadOutlined />} disabled={!isProcessRunning} ghost />
                        </Tooltip>
                    </Popconfirm>
                </div>
            </Space>
        </div>
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
