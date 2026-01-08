import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, message, InputNumber, Space, Tag } from 'antd';
import { SaveOutlined, ApiOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useServerStore } from '../store/useStore';

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  
  // Use global store
  const { isConnected, connect, disconnect } = useServerStore();

  useEffect(() => {
    // Load settings from Electron store
    const loadSettings = async () => {
      try {
        const settings = await window.ipcRenderer.invoke('get-settings');
        if (settings) {
          form.setFieldsValue(settings);
        }
        // Check current status
        const status = await window.ipcRenderer.invoke('rcon-status');
        if (status) connect(); else disconnect();
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, [form, connect, disconnect]);

  const onFinish = async (values: any) => {
    try {
      await window.ipcRenderer.invoke('save-settings', values);
      messageApi.success('Settings saved successfully');
    } catch (error) {
      messageApi.error('Failed to save settings');
      console.error(error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
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

  return (
    <div className="site-layout-content">
      {contextHolder}
      <Card 
        title={
          <Space>
            <span>RCON Configuration</span>
            {isConnected ? <Tag color="success">Connected</Tag> : <Tag color="error">Disconnected</Tag>}
          </Space>
        } 
        bordered={false} 
        style={{ maxWidth: 600 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            rconHost: '',
            rconPort: 2302,
            rconPassword: ''
          }}
        >
          <Form.Item
            label="Server IP / Host"
            name="rconHost"
            rules={[{ required: true, message: 'Please enter server IP' }]}
          >
            <Input placeholder="127.0.0.1" />
          </Form.Item>

          <Form.Item
            label="RCON Port"
            name="rconPort"
            rules={[{ required: true, message: 'Please enter RCON port' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="2302" />
          </Form.Item>

          <Form.Item
            label="RCON Password"
            name="rconPassword"
            rules={[{ required: true, message: 'Please enter RCON password' }]}
          >
            <Input.Password placeholder="SecretPassword" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                Save Settings
              </Button>
              
              {!isConnected ? (
                <Button 
                  onClick={handleConnect} 
                  loading={loading} 
                  icon={<ApiOutlined />}
                  style={{ borderColor: '#fa541c', color: '#fa541c' }}
                >
                  Test Connection
                </Button>
              ) : (
                <Button 
                  onClick={handleDisconnect} 
                  loading={loading} 
                  danger 
                  icon={<DisconnectOutlined />}
                >
                  Disconnect
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Settings;
