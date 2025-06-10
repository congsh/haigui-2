import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 导入样式
import '@/styles/index.css';

// 导入上下文提供者
import { AuthProvider } from '@/contexts/AuthContext';
import { RoomProvider } from '@/contexts/RoomContext';

// 导入页面组件
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import CreateRoomPage from '@/pages/CreateRoomPage';
import RoomPage from '@/pages/RoomPage';
import JoinPage from '@/pages/JoinPage';
import NotFoundPage from '@/pages/NotFoundPage';

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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </RoomProvider>
    </AuthProvider>
  </React.StrictMode>
); 