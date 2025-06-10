import React, { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ChatBox from '@/components/ChatBox';
import ParticipantList from '@/components/ParticipantList';
import RoomInfo from '@/components/RoomInfo';
import { useAuth } from '@/contexts/AuthContext';
import { useRoom } from '@/contexts/RoomContext';
import useRealtime from '@/hooks/useRealtime';

// 房间页面组件
const RoomPage = () => {
  const { roomId } = useParams();
  const { isAuthenticated } = useAuth();
  const { joinRoom, currentRoom, loading, error } = useRoom();
  const [pageError, setPageError] = useState(null);
  const navigate = useNavigate();
  
  // 使用实时通信
  const { connected } = useRealtime();
  
  // 如果未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // 初次加载时尝试加入房间
  useEffect(() => {
    const attemptJoinRoom = async () => {
      if (!roomId) return;
      
      try {
        // 如果当前不在这个房间，尝试加入
        if (!currentRoom || currentRoom.roomId !== roomId) {
          await joinRoom(roomId);
        }
      } catch (err) {
        console.error('加入房间失败:', err);
        setPageError(err.message || '房间不存在或已关闭');
      }
    };
    
    attemptJoinRoom();
  }, [roomId, currentRoom, joinRoom]);
  
  // 如果已加载但房间不存在或不匹配
  if (!loading && (!currentRoom || currentRoom.roomId !== roomId)) {
    if (pageError) {
      return (
        <Layout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {pageError}
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-primary-600 hover:text-primary-800"
            >
              返回首页
            </button>
          </div>
        </Layout>
      );
    }
    
    // 还在加载中
    if (loading) {
      return (
        <Layout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <p className="text-gray-600">正在加载房间...</p>
          </div>
        </Layout>
      );
    }
    
    // 没有错误但房间不存在，直接返回首页
    return <Navigate to="/" />;
  }
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 实时连接状态提示 */}
        {!connected && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-md mb-6">
            正在建立实时连接，某些功能可能暂时不可用...
          </div>
        )}
        
        {/* 主要内容区 */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧：房间信息和参与者列表 */}
          <div className="w-full lg:w-1/3 space-y-6">
            <RoomInfo />
            <ParticipantList />
          </div>
          
          {/* 右侧：聊天区 */}
          <div className="w-full lg:w-2/3">
            <ChatBox 
              maxHeight="70vh"
              className="h-full"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RoomPage; 