import React from 'react';
import { Card, Table, Tag, Typography, Space, Input } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useServerStore } from '../store/useStore';

const { Text } = Typography;

const Players: React.FC = () => {
  const { isConnected, players } = useServerStore();

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'GUID',
      dataIndex: 'guid',
      key: 'guid',
      render: (text: string) => (
        <Text copyable={{ text: text }} style={{ fontSize: 12 }}>
            {text ? text.substring(0, 8) + '...' : 'N/A'}
        </Text>
      )
    },
    {
      title: 'IP Address',
      dataIndex: 'ip',
      key: 'ip',
      render: (ip: string) => <span style={{ fontFamily: 'monospace' }}>{ip || 'Unknown'}</span>
    },
    {
      title: 'Ping',
      dataIndex: 'ping',
      key: 'ping',
      sorter: (a: any, b: any) => a.ping - b.ping,
      render: (ping: number) => {
        if (ping === undefined || ping === null) return <Tag>N/A</Tag>;
        return (
            <Tag color={ping < 100 ? 'success' : ping < 200 ? 'warning' : 'error'}>
            {ping} ms
            </Tag>
        );
      }
    },
    {
      title: 'Health',
      dataIndex: 'health',
      key: 'health',
      sorter: (a: any, b: any) => (a.health || 0) - (b.health || 0),
      render: (health?: number) => health ? <Tag color={health > 80 ? 'green' : health > 40 ? 'orange' : 'red'}>{Math.round(health)}%</Tag> : '-'
    },
    {
      title: 'Position',
      dataIndex: 'pos',
      key: 'pos',
      render: (pos?: string) => pos ? <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{pos}</span> : '-'
    }
  ];

  return (
    <div className="site-layout-content">
      <Card 
        title={<Space><UserOutlined /><span>Player Management</span></Space>} 
        bordered={false}
        extra={<Input placeholder="Search player..." prefix={<SearchOutlined />} style={{ width: 200 }} />}
      >
        <Table 
          dataSource={players} 
          columns={columns} 
          rowKey="id" 
          pagination={{ pageSize: 10 }} 
          size="middle"
          locale={{ emptyText: isConnected ? 'No players online' : 'Server offline' }}
        />
      </Card>
    </div>
  );
};

export default Players;
