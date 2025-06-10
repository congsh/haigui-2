import { useEffect, useState, useCallback } from 'react';
import { createRealtimeConnection, joinRealtimeConversation } from '@/utils/leancloud';
import { useAuth } from '@/contexts/AuthContext';
import { useRoom } from '@/contexts/RoomContext';

// 自定义Hook，用于管理实时连接
const useRealtime = () => {
  const { user } = useAuth();
  const { 
    currentRoom, 
    participants, 
    addMessage, 
    updateParticipant, 
    loadRoomData 
  } = useRoom();
  
  const [realtimeClient, setRealtimeClient] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // 初始化实时连接
  const initializeRealtime = useCallback(async () => {
    if (!user || !currentRoom) return;
    
    try {
      // 创建实时客户端
      const client = await createRealtimeConnection(user.id);
      setRealtimeClient(client);
      
      // 监听连接状态
      client.on('disconnect', () => {
        setConnected(false);
        console.log('实时连接断开');
      });
      
      client.on('reconnect', () => {
        setConnected(true);
        console.log('实时连接已重新建立');
      });
      
      client.on('reconnecterror', () => {
        setError('重新连接失败，请刷新页面');
      });
      
      // 创建或加入对话
      const participantIds = participants.map(p => p.userId);
      const conv = await joinRealtimeConversation(client, currentRoom.roomId, participantIds);
      setConversation(conv);
      setConnected(true);
      
      // 设置消息接收器
      conv.on('message', (message) => {
        const messageData = JSON.parse(message.text);
        
        // 根据消息类型处理
        switch (messageData.type) {
          case 'question':
          case 'answer':
          case 'clue':
          case 'interaction':
            addMessage(messageData);
            break;
          case 'participant_join':
            updateParticipant(messageData.participant);
            break;
          case 'room_update':
            loadRoomData(currentRoom.roomId);
            break;
          default:
            console.log('收到未知类型消息:', messageData);
        }
      });
      
      return client;
    } catch (err) {
      console.error('初始化实时连接失败:', err);
      setError(err.message);
      setConnected(false);
      return null;
    }
  }, [user, currentRoom, participants, addMessage, updateParticipant, loadRoomData]);
  
  // 当用户或房间变化时，初始化实时连接
  useEffect(() => {
    let client = null;
    
    if (user && currentRoom) {
      initializeRealtime().then(newClient => {
        client = newClient;
      });
    }
    
    // 清理函数
    return () => {
      if (client) {
        client.close();
        setRealtimeClient(null);
        setConversation(null);
        setConnected(false);
      }
    };
  }, [user, currentRoom, initializeRealtime]);
  
  // 发送实时消息
  const sendRealtimeMessage = useCallback(async (messageData) => {
    if (!conversation || !connected) {
      throw new Error('实时连接未建立');
    }
    
    try {
      await conversation.send({
        text: JSON.stringify(messageData),
      });
      return true;
    } catch (err) {
      console.error('发送实时消息失败:', err);
      setError(err.message);
      return false;
    }
  }, [conversation, connected]);
  
  return {
    realtimeClient,
    conversation,
    connected,
    error,
    sendRealtimeMessage,
  };
};

export default useRealtime;