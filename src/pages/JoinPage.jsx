import React from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import JoinRoomForm from '@/components/JoinRoomForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRoom } from '@/contexts/RoomContext';
import { parseInviteCode } from '@/utils/helpers';

// 加入房间页面组件
const JoinPage = () => {
  const { inviteCode } = useParams();
  const { isAuthenticated } = useAuth();
  const { joinRoom, currentRoom } = useRoom();
  const navigate = useNavigate();
  
  // 如果未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // 如果已经在房间中，重定向到房间页面
  if (currentRoom) {
    return <Navigate to={`/room/${currentRoom.roomId}`} />;
  }
  
  // 处理加入房间
  const handleJoinRoom = async (roomId) => {
    try {
      await joinRoom(roomId);
      return true;
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  };
  
  // 解析邀请码
  let decodedTitle = '';
  if (inviteCode) {
    try {
      const { title } = parseInviteCode(inviteCode);
      decodedTitle = title;
    } catch (error) {
      console.error('解析邀请码失败:', error);
    }
  }
  
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">加入房间</h1>
          
          {decodedTitle && (
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
              您正在加入房间: {decodedTitle}
            </div>
          )}
          
          <JoinRoomForm 
            onJoin={handleJoinRoom}
            initialInviteCode={inviteCode}
          />
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-primary-600 hover:text-primary-800"
          >
            返回首页
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default JoinPage;