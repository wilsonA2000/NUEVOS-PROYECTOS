import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Inbox from '../pages/messages/Inbox';
import ThreadDetail from '../pages/messages/ThreadDetail';
import Compose from '../pages/messages/Compose';

const MessageRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Inbox />} />
      <Route path="/thread/:threadId" element={<ThreadDetail />} />
      <Route path="/compose" element={<Compose />} />
    </Routes>
  );
};

export default MessageRoutes; 