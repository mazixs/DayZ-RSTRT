import React from 'react';
import { Card, Col, Row, Statistic, Progress, Table, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, UserOutlined } from '@ant-design/icons';
import { useServerStore } from '../store/useStore';

const Dashboard: React.FC = () => {
  const { isConnected, playerCount, players, lastUpdate, serverFps, lastTelemetryUpdate } = useServerStore();

  const isModConnected = Date.now() - lastTelemetryUpdate < 15000 && lastTelemetryUpdate > 0;

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'GUID',
      dataIndex: 'guid',
      key: 'guid',
      render: (text: string) => <Tag>{text.substring(0, 8)}...</Tag>
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: 'Ping',
      dataIndex: 'ping',
      key: 'ping',
      render: (ping: number) => (
        <Tag color={ping < 100 ? 'success' : ping < 200 ? 'warning' : 'error'}>
          {ping} ms
        </Tag>
      )
    },
  ];

  return (
    <div className="site-layout-content">
      <Row gutter={16}>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="Server Status"
              value={isConnected ? 'Online' : 'Offline'}
              valueStyle={{ color: isConnected ? '#3f8600' : '#cf1322' }}
              suffix={
                <Tag color={isModConnected ? 'success' : 'default'} style={{ marginLeft: 10, fontSize: 12, verticalAlign: 'middle' }}>
                  {isModConnected ? 'Mod Active' : 'Mod Waiting'}
                </Tag>
              }
            />
            {lastUpdate > 0 && <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Updated: {new Date(lastUpdate).toLocaleTimeString()}</div>}
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="Players Online"
              value={playerCount}
              precision={0}
              valueStyle={{ color: '#fa541c' }} // Use accent color
              prefix={<UserOutlined />}
              suffix="/ 60"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="Server FPS"
              value={isConnected ? serverFps : 0} 
              precision={0}
              valueStyle={{ color: !isConnected ? '#cf1322' : serverFps > 50 ? '#3f8600' : serverFps > 30 ? '#faad14' : '#cf1322' }}
              prefix={<ArrowUpOutlined />} 
              suffix={serverFps > 0 ? " FPS" : ""}
            />
          </Card>
        </Col>
      </Row>
      
      <div style={{ marginTop: 24 }}>
        <Row gutter={16}>
           <Col span={16}>
             <Card title="Player List" bordered={false} bodyStyle={{ padding: 0 }}>
               <Table 
                 dataSource={players} 
                 columns={columns} 
                 rowKey="id" 
                 pagination={{ pageSize: 5 }} 
                 size="small"
                 locale={{ emptyText: isConnected ? 'No players online' : 'Server offline' }}
               />
             </Card>
           </Col>
           <Col span={8}>
             <Card title="Server Health" bordered={false}>
                <div style={{ marginBottom: 16 }}>
                  <span>CPU Usage</span>
                  <Progress percent={32} strokeColor="#3f8600" size="small" />
                </div>
                <div>
                  <span>RAM Usage</span>
                  <Progress percent={54} strokeColor="#faad14" size="small" />
                </div>
             </Card>
           </Col>
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;
