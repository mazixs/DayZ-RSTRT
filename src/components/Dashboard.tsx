import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Progress, Table, Tag, Alert, Space, Typography, Tooltip } from 'antd';
import { ArrowUpOutlined, UserOutlined, ClockCircleOutlined, SyncOutlined, PoweroffOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useServerStore } from '../store/useStore';

const { Text } = Typography;

const Dashboard: React.FC = () => {
  const { isConnected, playerCount, players, lastUpdate, serverFps, lastTelemetryUpdate, isProcessRunning, scheduler, gameTime } = useServerStore();
  const [timeToRestart, setTimeToRestart] = useState<string>('--:--');

  const isModConnected = Date.now() - lastTelemetryUpdate < 15000 && lastTelemetryUpdate > 0;

  // Freeze Detection: RCON is connected (process alive) but Telemetry stopped (simulation dead)
  const isFrozen = isConnected && !isModConnected && lastTelemetryUpdate > 0;

  // Stale Data Detection: RCON connected but no updates for > 10s
  const isStale = isConnected && (Date.now() - lastUpdate > 10000);

  useEffect(() => {
    if (isFrozen) {
      if (Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
      
      new Notification('DayZ Server Critical Warning', {
        body: 'Server Freeze Detected! Telemetry has stopped receiving updates.',
        silent: false
      });
    }
  }, [isFrozen]);

  // Countdown Timer Logic
  useEffect(() => {
      const timer = setInterval(() => {
          if (scheduler.isRunning && scheduler.nextRestartTime > 0) {
              const now = Date.now();
              const diff = scheduler.nextRestartTime - now;
              
              if (diff <= 0) {
                  setTimeToRestart('Restarting...');
              } else {
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                  setTimeToRestart(`${hours}h ${minutes}m ${seconds}s`);
              }
          } else {
              setTimeToRestart('Disabled');
          }
      }, 1000);
      return () => clearInterval(timer);
  }, [scheduler]);

  // Format In-Game Time
  const formatGameTime = () => {
      if (!gameTime) return '--:--';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(gameTime.hour)}:${pad(gameTime.minute)}`;
  };

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
      render: (text: string) => (
        <Text copyable={{ text: text }} style={{ fontSize: 12 }}>
            {text ? text.substring(0, 8) + '...' : 'N/A'}
        </Text>
      )
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      render: (ip: string) => <span style={{ fontSize: 12 }}>{ip || 'Unknown'}</span>
    },
    {
      title: 'Ping',
      dataIndex: 'ping',
      key: 'ping',
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
      render: (health?: number) => health ? <Tag color={health > 80 ? 'green' : health > 40 ? 'orange' : 'red'}>{Math.round(health)}%</Tag> : '-'
    },
    {
      title: 'Position',
      dataIndex: 'pos',
      key: 'pos',
      render: (pos?: string) => pos ? <span style={{ fontSize: 12 }}>{pos}</span> : '-'
    }
  ];

  return (
    <div className="site-layout-content">
      {isFrozen && (
        <Alert
          message="Critical Warning: Server Freeze Detected"
          description="RCON is active, but Telemetry has stopped. The server process is running but the game simulation loop may be frozen."
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      
      {isStale && (
        <Alert
          message="Connection Lagging"
          description="RCON updates are delayed. Player list and status may be outdated."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      
      {/* Status Overview Row */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
          {/* Server Process Status */}
          <Col span={5}>
            <Card bordered={false}>
                <Statistic 
                    title="Process Status"
                    value={isProcessRunning ? 'Running' : 'Stopped'}
                    valueStyle={{ color: isProcessRunning ? '#3f8600' : '#cf1322' }}
                    prefix={isProcessRunning ? <SyncOutlined spin /> : <PoweroffOutlined />}
                />
            </Card>
          </Col>

          {/* RCON Status */}
          <Col span={5}>
            <Card bordered={false}>
              <Statistic
                title="RCON Connection"
                value={isConnected ? 'Online' : 'Offline'}
                valueStyle={{ color: isConnected ? '#3f8600' : '#cf1322' }}
                suffix={
                  <Tag color={isModConnected ? 'success' : 'default'} style={{ marginLeft: 10, fontSize: 12, verticalAlign: 'middle' }}>
                    {isModConnected ? 'Mod Active' : 'Mod Waiting'}
                  </Tag>
                }
              />
            </Card>
          </Col>

          {/* Next Restart Countdown */}
          <Col span={5}>
            <Card bordered={false}>
                <Statistic 
                    title="Next Restart"
                    value={timeToRestart}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: scheduler.isRunning ? '#1890ff' : '#8c8c8c', fontSize: '1.2rem' }}
                />
                {scheduler.isRunning && <div style={{ fontSize: 10, color: '#888' }}>Interval: {scheduler.intervalMinutes}m</div>}
            </Card>
          </Col>

          {/* FPS */}
          <Col span={4}>
            <Card bordered={false}>
              <Statistic
                title="Server FPS"
                value={isConnected ? serverFps : 0} 
                precision={serverFps < 10 ? 2 : 0}
                decimalSeparator="."
                valueStyle={{ color: !isConnected ? '#cf1322' : serverFps > 50 ? '#3f8600' : serverFps > 30 ? '#faad14' : '#cf1322' }}
                prefix={<ArrowUpOutlined />} 
                suffix=" FPS"
              />
            </Card>
          </Col>

          {/* In-Game Time */}
          <Col span={5}>
            <Card bordered={false}>
              <Statistic
                title="In-Game Time"
                value={gameTime ? formatGameTime() : '--:--'}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
              {gameTime && <div style={{ fontSize: 10, color: '#888' }}>{gameTime.day}.{gameTime.month}.{gameTime.year}</div>}
            </Card>
          </Col>
      </Row>
      
      <div style={{ marginTop: 24 }}>
        <Row gutter={16}>
           <Col span={24}>
             <Card title={<Space><UserOutlined /><span>Online Players ({playerCount})</span></Space>} bordered={false} bodyStyle={{ padding: 0 }}>
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
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;
