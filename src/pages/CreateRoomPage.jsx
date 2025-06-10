import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import RoomForm from '@/components/RoomForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRoom } from '@/contexts/RoomContext';

// 创建房间页面组件
const CreateRoomPage = () => {
  const { isAuthenticated } = useAuth();
  const { createRoom, currentRoom } = useRoom();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // 如果未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // 如果已经在房间中，重定向到房间页面
  if (currentRoom) {
    return <Navigate to={`/room/${currentRoom.roomId}`} />;
  }
  
  // 处理创建房间
  const handleCreateRoom = async (roomData) => {
    try {
      setLoading(true);
      setError(null);
      
      // 创建房间
      const newRoom = await createRoom(roomData);
      
      // 重定向到房间页面
      navigate(`/room/${newRoom.roomId}`);
    } catch (error) {
      console.error('创建房间失败:', error);
      setError(error.message || '创建房间失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">创建新房间</h1>
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          
          <RoomForm 
            onSubmit={handleCreateRoom}
            loading={loading}
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

export default CreateRoomPage; 
 