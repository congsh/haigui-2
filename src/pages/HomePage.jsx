import React from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import JoinRoomForm from '@/components/JoinRoomForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRoom } from '@/contexts/RoomContext';

// 首页组件
const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const { currentRoom, joinRoom } = useRoom();
  
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
      // 加入房间
      await joinRoom(roomId);
      return true;
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  };
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* 左侧介绍 */}
          <div className="w-full md:w-1/2 lg:w-2/3">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              欢迎来到海龟汤在线房间
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              海龟汤是一种推理游戏，参与者需要通过提问和主持人的回答来揭开谜底。在这里，你可以创建或加入房间，与朋友一起解谜。
            </p>
            
            <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">游戏规则</h2>
              <ul className="space-y-2 text-gray-600">
                <li>• 主持人设置一个谜题场景，参与者只知道结果</li>
                <li>• 参与者通过是非问题逐步接近真相</li>
                <li>• 主持人只能回答"是"、"否"或"无关"</li>
                <li>• 当有人猜出真相后，主持人可揭晓答案</li>
              </ul>
            </div>
            
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">使用提示</h2>
              <ul className="space-y-2 text-gray-600">
                <li>• 创建房间成为主持人，设置谜题供他人解答</li>
                <li>• 加入房间成为参与者，通过提问解开谜题</li>
                <li>• 使用邀请链接邀请朋友加入你的房间</li>
                <li>• 聊天区实时显示所有问答，方便回顾</li>
              </ul>
            </div>
          </div>
          
          {/* 右侧表单 */}
          <div className="w-full md:w-1/2 lg:w-1/3">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <JoinRoomForm 
                onJoin={handleJoinRoom}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage; 