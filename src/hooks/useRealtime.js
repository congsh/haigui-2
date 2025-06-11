import { useEffect, useState, useCallback } from 'react';
import { createRealtimeConnection, joinRealtimeConversation } from '@/utils/leancloud';
import { useAuth } from '@/contexts/AuthContext';
import AV from 'leancloud-storage';
import { TextMessage } from 'leancloud-realtime';

// 自定义Hook，用于管理实时连接
const useRealtime = () => {
  const { user } = useAuth();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messageListeners, setMessageListeners] = useState([]);
  
  const [realtimeClient, setRealtimeClient] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // 添加消息监听器
  const addMessageListener = useCallback((listener) => {
    setMessageListeners(prev => [...prev, listener]);
    return () => {
      setMessageListeners(prev => prev.filter(l => l !== listener));
    };
  }, []);
  
  // 设置当前房间和参与者
  const setRoom = useCallback((room, roomParticipants) => {
    setCurrentRoom(room);
    setParticipants(roomParticipants);
  }, []);
  
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
        try {
          // 从消息中提取数据
          let messageData;
          if (message.text) {
            try {
              messageData = JSON.parse(message.text);
            } catch (e) {
              // 如果不是有效的 JSON，则直接使用文本
              messageData = message.text;
            }
          } else if (message._lctext) {
            // 兼容处理不同版本的消息格式
            try {
              messageData = JSON.parse(message._lctext);
            } catch (e) {
              messageData = message._lctext;
            }
          } else {
            console.warn('收到格式不支持的消息:', message);
            return;
          }
          
          // 通知所有监听器
          setMessageListeners(currentListeners => {
            currentListeners.forEach(listener => {
              try {
                listener(messageData);
              } catch (err) {
                console.error('处理消息时发生错误:', err);
              }
            });
            return currentListeners;
          });
        } catch (err) {
          console.error('解析消息时发生错误:', err);
        }
      });
      
      return client;
    } catch (err) {
      console.error('初始化实时连接失败:', err);
      setError(err.message);
      setConnected(false);
      return null;
    }
  }, [user, currentRoom, participants]);
  
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
      // 确保消息数据是字符串格式
      const messageText = typeof messageData === 'string' 
        ? messageData 
        : JSON.stringify(messageData);
      
      // 创建文本消息对象
      const message = new TextMessage(messageText);
      
      // 发送消息
      await conversation.send(message);
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
    setRoom,
    addMessageListener,
  };
};

export default useRealtime;