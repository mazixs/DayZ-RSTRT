import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Alert, Tag } from 'antd';
import { ArrowUpOutlined, UserOutlined, ClockCircleOutlined, SyncOutlined, PoweroffOutlined, EnvironmentOutlined, WifiOutlined } from '@ant-design/icons';
import { useServerStore } from '../store/useStore';

const Dashboard: React.FC = () => {
  const { isConnected, playerCount, lastUpdate, serverFps, lastTelemetryUpdate, isProcessRunning, scheduler, gameTime } = useServerStore();
  const [timeToRestart, setTimeToRestart] = useState<string>('--:--');

  const isModConnected = Date.now() - lastTelemetryUpdate < 15000 && lastTelemetryUpdate > 0;

  // Freeze Detection: RCON is connected (process alive) but Telemetry stopped (simulation dead)
  const isFrozen = isConnected && !isModConnected && lastTelemetryUpdate > 0;

  // Stale Data Detection: RCON connected but no updates for > 45s (Heartbeat is 30s)
  const isStale = isConnected && (Date.now() - lastUpdate > 45000);

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
      
      {/* Key Metrics Grid */}
      <Row gutter={[16, 16]}>
          {/* 1. Process Status */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} hoverable>
                <Statistic 
                    title="Process"
                    value={isProcessRunning ? 'Running' : 'Stopped'}
                    valueStyle={{ color: isProcessRunning ? '#3f8600' : '#cf1322', fontSize: '1.2rem' }}
                    prefix={isProcessRunning ? <SyncOutlined spin /> : <PoweroffOutlined />}
                />
            </Card>
          </Col>

          {/* 2. RCON Status */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} hoverable>
              <Statistic
                title="RCON"
                value={isConnected ? 'Online' : 'Offline'}
                valueStyle={{ color: isConnected ? '#3f8600' : '#cf1322', fontSize: '1.2rem' }}
                prefix={<WifiOutlined />}
              />
               <div style={{ marginTop: 8 }}>
                 <Tag color={isModConnected ? 'success' : 'default'} style={{ margin: 0, width: '100%', textAlign: 'center' }}>
                    {isModConnected ? 'Mod Active' : 'Waiting...'}
                 </Tag>
               </div>
            </Card>
          </Col>

          {/* 3. Online Players */}
          <Col xs={24} sm={12} md={8} lg={4}>
             <Card bordered={false} hoverable>
                <Statistic 
                    title="Online Players"
                    value={playerCount}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                />
             </Card>
          </Col>

          {/* 4. FPS */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} hoverable>
              <Statistic
                title="Server FPS"
                value={isConnected ? serverFps : 0} 
                precision={serverFps < 10 ? 2 : 0}
                decimalSeparator="."
                valueStyle={{ color: !isConnected ? '#cf1322' : serverFps > 50 ? '#3f8600' : serverFps > 30 ? '#faad14' : '#cf1322' }}
                prefix={<ArrowUpOutlined />} 
              />
            </Card>
          </Col>

          {/* 5. Next Restart */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} hoverable>
                <Statistic 
                    title="Next Restart"
                    value={timeToRestart}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: scheduler.isRunning ? '#1890ff' : '#8c8c8c', fontSize: '1rem' }}
                />
            </Card>
          </Col>

          {/* 6. In-Game Time */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card bordered={false} hoverable>
              <Statistic
                title="In-Game Time"
                value={gameTime ? formatGameTime() : '--:--'}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
              {gameTime && <div style={{ fontSize: 10, color: '#888', marginTop: 5 }}>{gameTime.day}.{gameTime.month}.{gameTime.year}</div>}
            </Card>
          </Col>
      </Row>
      
      {/* Placeholder for future widgets (Graphs, etc.) */}
      <div style={{ marginTop: 24, textAlign: 'center', color: '#666' }}>
          <UserOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }} />
          <p>Select "Players" from the menu to manage connected users.</p>
      </div>
    </div>
  );
};

export default Dashboard;
