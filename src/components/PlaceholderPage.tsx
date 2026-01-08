import React from 'react';
import { Empty } from 'antd';

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <Empty description={<span>{title} (Coming Soon)</span>} />
  </div>
);

export default PlaceholderPage;
