import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, message, InputNumber, Space, Tabs, Switch, Divider, Alert } from 'antd';
import { SaveOutlined, ApiOutlined, DisconnectOutlined, SettingOutlined } from '@ant-design/icons';
import { useServerStore } from '../store/useStore';

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  
  // Use global store
  const { isConnected, connect, disconnect, setProcessStatus, scheduler, setSchedulerStatus } = useServerStore();

  useEffect(() => {
    // Load settings from Electron store
    const loadSettings = async () => {
      try {
        const settings = await window.ipcRenderer.invoke('get-settings');
        if (settings) {
          form.setFieldsValue(settings);
          
          // Auto-start scheduler if enabled in settings (logic could be moved to main.ts for auto-start on app launch)
          if (settings.schedulerEnabled) {
             // We don't auto-start here to avoid double-triggers, main process should handle persistence or we explicitly start
          }
        }
        
        // Sync Status
        const status = await window.ipcRenderer.invoke('rcon-status');
        if (status) connect(); else disconnect();
        
        const procStatus = await window.ipcRenderer.invoke('process-status');
        setProcessStatus(procStatus);

        const schedStatus = await window.ipcRenderer.invoke('scheduler-status');
        setSchedulerStatus(schedStatus);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, [form, connect, disconnect, setProcessStatus, setSchedulerStatus]);

  const onFinish = async (values: any) => {
    try {
      // Get current settings to ensure we merge and don't lose data from other tabs (like ProcessManager)
      const currentSettings = await window.ipcRenderer.invoke('get-settings');
      const newSettings = { ...currentSettings, ...values };

      await window.ipcRenderer.invoke('save-settings', newSettings);
      messageApi.success('Settings saved successfully');
      
      // Update Scheduler Messages immediately
      if (values.messages) {
         await window.ipcRenderer.invoke('scheduler-set-messages', values.messages);
      }

      // Update Scheduler if running
      if (values.schedulerEnabled) {
         await window.ipcRenderer.invoke('scheduler-start', values.restartInterval || 240);
      } else {
         await window.ipcRenderer.invoke('scheduler-stop');
      }

    } catch (error) {
      messageApi.error('Failed to save settings');
      console.error(error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const values = await form.getFieldsValue();
      await window.ipcRenderer.invoke('rcon-connect', values);
      connect();
      messageApi.success('Connected to RCON server');
    } catch (error: any) {
      disconnect();
      messageApi.error(`Connection failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await window.ipcRenderer.invoke('rcon-disconnect');
      disconnect();
      messageApi.info('Disconnected');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const rconTab = (
      <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item label="Server IP / Host" name="rconHost" rules={[{ required: true }]}>
            <Input placeholder="127.0.0.1" />
          </Form.Item>
          <Form.Item label="RCON Port" name="rconPort" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="2302" />
          </Form.Item>
          <Form.Item label="RCON Password" name="rconPassword" rules={[{ required: true }]}>
            <Input.Password placeholder="SecretPassword" />
          </Form.Item>
          <Space>
              {!isConnected ? (
                <Button onClick={handleConnect} loading={loading} icon={<ApiOutlined />} type="primary" ghost>Test Connection</Button>
              ) : (
                <Button onClick={handleDisconnect} loading={loading} danger icon={<DisconnectOutlined />}>Disconnect</Button>
              )}
          </Space>
      </Space>
  );

  const schedulerTab = (
      <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item label="Enable Scheduler" name="schedulerEnabled" valuePropName="checked">
             <Switch />
          </Form.Item>
          <Form.Item label="Restart Interval (Minutes)" name="restartInterval" help="e.g. 240 for 4 hours">
             <InputNumber min={60} max={1440} step={30} style={{ width: 200 }} />
          </Form.Item>
          
          <Divider orientation="left">Custom Notification Messages</Divider>
          <p style={{ color: '#888', marginBottom: 16 }}>Customize the warnings sent to players before a restart.</p>
          
          <Form.Item label="30 Minutes Warning" name={['messages', '30']}>
             <Input placeholder="Weather Warning: Severe storm approaching in 30 minutes." />
          </Form.Item>
          <Form.Item label="15 Minutes Warning" name={['messages', '15']}>
             <Input placeholder="Weather Warning: Storm intensity increasing. Seek shelter in 15 minutes." />
          </Form.Item>
          <Form.Item label="5 Minutes Warning" name={['messages', '5']}>
             <Input placeholder="CRITICAL: Storm imminent. Evacuate to safe zone immediately (5 mins)." />
          </Form.Item>
          <Form.Item label="3 Minutes Warning" name={['messages', '3']}>
             <Input placeholder="CRITICAL: Safe zones closing in 3 minutes. LOG OUT NOW to save gear." />
          </Form.Item>
          <Form.Item label="2 Minutes Warning (Lock)" name={['messages', '2']}>
             <Input placeholder="System Alert: Server locking down. Incoming connection paused." />
          </Form.Item>
           <Form.Item label="1 Minute Warning" name={['messages', '1']}>
             <Input placeholder="IMPACT IMMINENT. Server shutdown in 60 seconds." />
          </Form.Item>

          <Alert message="Scheduler Status" description={
              scheduler.isRunning 
              ? `Active. Next restart at ${new Date(scheduler.nextRestartTime).toLocaleTimeString()}`
              : "Inactive"
          } type={scheduler.isRunning ? "success" : "info"} showIcon />
      </Space>
  );

  return (
    <div className="site-layout-content">
      {contextHolder}
      <Card 
        title={<Space><SettingOutlined /><span>Settings</span></Space>} 
        bordered={false} 
        style={{ maxWidth: 800 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            rconHost: '127.0.0.1',
            rconPort: 2302,
            autoRestart: true,
            schedulerEnabled: false,
            restartInterval: 240,
            messages: {
                30: "Weather Warning: Severe storm approaching in 30 minutes.",
                15: "Weather Warning: Storm intensity increasing. Seek shelter in 15 minutes.",
                5: "CRITICAL: Storm imminent. Evacuate to safe zone immediately (5 mins).",
                3: "CRITICAL: Safe zones closing in 3 minutes. LOG OUT NOW to save gear.",
                2: "System Alert: Server locking down. Incoming connection paused.",
                1: "IMPACT IMMINENT. Server shutdown in 60 seconds."
            }
          }}
        >
          <Tabs defaultActiveKey="1" items={[
              { key: '1', label: 'RCON', children: rconTab },
              { key: '3', label: 'Scheduler', children: schedulerTab }
          ]} />
          
          <Divider />
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large" block>
                Save All Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Settings;
