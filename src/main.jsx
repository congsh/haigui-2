import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 导入样式
import '@/styles/index.css';

// 导入清理任务初始化
import { initializeCleanup, cleanupOnUnload } from '@/utils/cleanup-init';

// 导入上下文提供者
import { AuthProvider } from '@/contexts/AuthContext';
import { RoomProvider } from '@/contexts/RoomContext';

// 导入页面组件
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import CreateRoomPage from '@/pages/CreateRoomPage';
import RoomPage from '@/pages/RoomPage';
import JoinPage from '@/pages/JoinPage';
import AdminPage from '@/pages/AdminPage';
import NotFoundPage from '@/pages/NotFoundPage';

// 初始化清理任务
initializeCleanup();

// 注册页面卸载清理
cleanupOnUnload();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RoomProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/create" element={<CreateRoomPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
            <Route path="/join/:inviteCode" element={<JoinPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </RoomProvider>
    </AuthProvider>
  </React.StrictMode>
);