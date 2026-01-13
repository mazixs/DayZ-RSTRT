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
          
          <Divider orientation="left">Scheduled Tasks (BEC Style)</Divider>
          <p style={{ color: '#888', marginBottom: 16 }}>
            Define commands to run at specific times before restart. 
            Use <code>say -1 Message</code> for global chat.
          </p>

          <Form.List name="schedulerTasks">
            {(fields, { add, remove }) => (
              <div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'minutesBefore']}
                      rules={[{ required: true, message: 'Missing time' }]}
                    >
                      <InputNumber placeholder="Min" style={{ width: 110 }} min={0} addonAfter="min" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'command']}
                      rules={[{ required: true, message: 'Missing command' }]}
                    >
                      <Input placeholder="Command (e.g. say -1 Hello)" style={{ width: 400 }} />
                    </Form.Item>
                    <DisconnectOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<ApiOutlined />}>
                    Add Task
                  </Button>
                </Form.Item>
              </div>
            )}
          </Form.List>

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
            schedulerTasks: [
                { minutesBefore: 30, command: 'say -1 RADIO ISLAND: Weather Warning: Severe storm approaching in 30 minutes.' },
                { minutesBefore: 15, command: 'say -1 RADIO ISLAND: Weather Warning: Storm intensity increasing. Seek shelter in 15 minutes.' },
                { minutesBefore: 5, command: 'say -1 RADIO ISLAND: CRITICAL: Storm imminent. Evacuate to safe zone immediately (5 mins).' },
                { minutesBefore: 3, command: 'say -1 RADIO ISLAND: CRITICAL: Safe zones closing in 3 minutes. LOG OUT NOW to save gear.' },
                { minutesBefore: 2, command: 'say -1 RADIO ISLAND: System Alert: Server locking down. Incoming connection paused.' },
                { minutesBefore: 2, command: '#lock' },
                { minutesBefore: 1, command: 'say -1 RADIO ISLAND: IMPACT IMMINENT. Server shutdown in 60 seconds.' }
            ]
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
