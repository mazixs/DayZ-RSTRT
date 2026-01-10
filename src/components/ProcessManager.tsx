import React, { useEffect } from 'react';
import { Form, Input, Button, Card, message, Switch, Space, Tag, Divider, Typography } from 'antd';
import { PlayCircleOutlined, StopOutlined, ReloadOutlined, SaveOutlined, DesktopOutlined } from '@ant-design/icons';
import { useServerStore } from '../store/useStore';

const { Text } = Typography;

const ProcessManager: React.FC = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { isProcessRunning, setProcessStatus } = useServerStore();

  useEffect(() => {
    // Load settings
    const loadSettings = async () => {
      try {
        const settings = await window.ipcRenderer.invoke('get-settings');
        if (settings) {
          form.setFieldsValue(settings);
        }
        
        // Sync Status
        const procStatus = await window.ipcRenderer.invoke('process-status');
        setProcessStatus(procStatus);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
    
    // Listen for status updates
    const handleProcessStatus = (_event: any, status: string) => {
        setProcessStatus(status === 'running');
    };
    
    window.ipcRenderer.on('process-status-change', handleProcessStatus);
    return () => {
        window.ipcRenderer.off('process-status-change', handleProcessStatus);
    };
  }, [form, setProcessStatus]);

  const onSaveSettings = async (values: any) => {
      try {
          // We only save the process-related settings here. 
          // We should be careful not to overwrite other settings if we were fetching all settings.
          // Better: Get current settings, merge, save.
          const currentSettings = await window.ipcRenderer.invoke('get-settings');
          const newSettings = { ...currentSettings, ...values };
          
          await window.ipcRenderer.invoke('save-settings', newSettings);
          messageApi.success('Process configuration saved');
      } catch (error) {
          messageApi.error('Failed to save settings');
      }
  };

  const handleStart = async () => {
      try {
          const values = await form.getFieldsValue();
          if (!values.serverPath) {
              messageApi.error('Server executable path is required');
              return;
          }
          const args = values.launchArgs ? values.launchArgs.split(' ') : [];
          
          await window.ipcRenderer.invoke('process-start', {
              executablePath: values.serverPath,
              args: args,
              autoRestart: values.autoRestart
          });
          messageApi.success('Server start command sent');
      } catch (e: any) {
          messageApi.error('Failed to start server: ' + e.message);
      }
  };

  const handleStop = async () => {
      try {
          await window.ipcRenderer.invoke('process-stop', false);
          messageApi.info('Stop command sent');
      } catch (e: any) {
          messageApi.error('Failed to stop: ' + e.message);
      }
  };
  
  const handleRestart = async () => {
      try {
          await window.ipcRenderer.invoke('process-stop', false);
          messageApi.loading({ content: 'Restarting...', key: 'restart' });
          setTimeout(async () => {
             await handleStart();
             messageApi.success({ content: 'Restart command sent', key: 'restart' });
          }, 3000);
      } catch (e: any) {
          messageApi.error('Restart failed: ' + e.message);
      }
  };

  return (
    <div>
        {contextHolder}
        <Space direction="vertical" style={{ width: '100%' }} size="large">
            
            {/* Controls Section */}
            <Card title={<Space><DesktopOutlined /><span>Server Control</span></Space>} bordered={false}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <Space size="large">
                        <Text strong style={{ fontSize: 16 }}>Current Status:</Text>
                        <Tag color={isProcessRunning ? 'success' : 'error'} style={{ fontSize: 16, padding: '5px 15px' }}>
                            {isProcessRunning ? 'RUNNING' : 'STOPPED'}
                        </Tag>
                    </Space>
                    
                    <Space>
                        <Button 
                            type="primary" 
                            size="large" 
                            icon={<PlayCircleOutlined />} 
                            onClick={handleStart} 
                            disabled={isProcessRunning}
                            style={{ minWidth: 120 }}
                        >
                            Start
                        </Button>
                        <Button 
                            danger 
                            size="large" 
                            icon={<StopOutlined />} 
                            onClick={handleStop} 
                            disabled={!isProcessRunning}
                            style={{ minWidth: 120 }}
                        >
                            Stop
                        </Button>
                        <Button 
                            type="default" 
                            size="large" 
                            icon={<ReloadOutlined />} 
                            onClick={handleRestart} 
                            disabled={!isProcessRunning}
                        >
                            Restart
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* Configuration Section */}
            <Card title="Process Configuration" bordered={false}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onSaveSettings}
                    initialValues={{
                        autoRestart: true
                    }}
                >
                    <Form.Item label="Server Executable Path (.exe)" name="serverPath" help="Full path to DayZServer_x64.exe">
                        <Input placeholder="C:\Steam\steamapps\common\DayZServer\DayZServer_x64.exe" />
                    </Form.Item>
                    
                    <Form.Item label="Launch Arguments" name="launchArgs" help="e.g., -config=serverDZ.cfg -port=2302 -profiles=Profiles -dologs -adminlog -netlog -freezecheck">
                        <Input.TextArea rows={3} placeholder="-config=serverDZ.cfg -port=2302 ..." />
                    </Form.Item>
                    
                    <Form.Item label="Auto-Restart on Crash" name="autoRestart" valuePropName="checked">
                         <Switch />
                    </Form.Item>
                    
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                            Save Configuration
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </Space>
    </div>
  );
};

export default ProcessManager;
