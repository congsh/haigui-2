import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createRoom, 
  findRoomById, 
  joinRoom, 
  getRoomParticipants, 
  sendMessage, 
  getRoomMessages, 
  updateRoomStatus, 
  endRoom,
  removeParticipant 
} from '@/utils/leancloud';
import { useAuth } from './AuthContext';
import { generateRoomId, saveToLocalStorage, getFromLocalStorage, removeFromLocalStorage } from '@/utils/helpers';
import useRealtime from '@/hooks/useRealtime';

const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 使用实时通信功能
  const { sendRealtimeMessage, connected, setRoom, addMessageListener } = useRealtime();
  
  // 处理收到的实时消息
  useEffect(() => {
    if (!user) return;
    
    // 添加消息监听器
    const removeListener = addMessageListener((messageData) => {
      // 根据消息类型处理
      switch (messageData.type) {
        case 'question':
        case 'answer':
        case 'clue':
        case 'system':
        case 'interaction':
          // 避免重复添加消息
          setMessages(prev => {
            // 检查是否已存在此消息 (通过objectId或内容+时间+发送者组合)
            const messageExists = prev.some(m => 
              (m.objectId && m.objectId === messageData.objectId) || 
              (m.from === messageData.from && 
               m.content === messageData.content && 
               m.timestamp && messageData.timestamp && 
               new Date(m.timestamp).getTime() === new Date(messageData.timestamp).getTime())
            );
            if (messageExists) return prev;
            return [...prev, messageData];
          });
          break;
        case 'participant_join':
          // 更新参与者
          const newParticipant = messageData.participant;
          setParticipants(prev => {
            const exists = prev.some(p => p.userId === newParticipant.userId);
            if (exists) {
              return prev.map(p => p.userId === newParticipant.userId ? newParticipant : p);
            }
            return [...prev, newParticipant];
          });
          break;
        case 'participant_leave':
          // 移除参与者
          const leftParticipant = messageData.participant;
          setParticipants(prev => 
            prev.filter(p => p.userId !== leftParticipant.userId)
          );
          break;
        case 'room_update':
          // 重新加载房间数据
          if (currentRoom && currentRoom.roomId === messageData.roomId) {
            loadRoomData(currentRoom.roomId);
          }
          break;
        default:
          console.log('收到未知类型消息:', messageData);
      }
    });
    
    // 清理函数
    return () => {
      removeListener();
    };
  }, [user, currentRoom, addMessageListener]);
  
  // 当房间或参与者变化时，更新实时通信
  useEffect(() => {
    if (currentRoom && participants.length > 0) {
      setRoom(currentRoom, participants);
    }
  }, [currentRoom, participants, setRoom]);
  
  // 初始化时检查是否有保存的房间
  useEffect(() => {
    if (user) {
      const savedRoom = getFromLocalStorage('currentRoom');
      if (savedRoom) {
        setCurrentRoom(savedRoom);
        
        // 加载房间数据
        loadRoomData(savedRoom.roomId);
      }
    }
  }, [user]);
  
  // 加载房间数据
  const loadRoomData = async (roomId) => {
    if (!roomId || !user) return;
    
    let retries = 0;
    const maxRetries = 3;
    
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 获取房间信息
        const roomData = await findRoomById(roomId);
        if (roomData) {
          setCurrentRoom(roomData);
          
          // 如果房间有封面图片，发送一条包含图片的系统消息
          if (roomData.imageUrl && roomData.status === 'active') {
            // 检查是否已经发送过图片消息
            const hasImageMessage = messages.some(m => 
              m.type === 'system' && 
              m.content === '谜题图片' && 
              m.imageUrl === roomData.imageUrl
            );
            
            if (!hasImageMessage) {
              sendMessage('谜题图片', 'system', roomData.imageUrl);
            }
          }
        }
        
        // 获取参与者列表
        const participantsList = await getRoomParticipants(roomId);
        setParticipants(participantsList);
        
        // 获取消息历史
        const messageHistory = await getRoomMessages(roomId);
        setMessages(messageHistory);
      } catch (err) {
        console.error('加载房间数据失败:', err);
        
        // 添加重试逻辑
        if (retries < maxRetries) {
          retries++;
          console.log(`尝试重新加载 (${retries}/${maxRetries})...`);
          // 延迟1秒后重试
          setTimeout(() => loadData(), 1000);
          return;
        }
        
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    // 开始加载
    loadData();
  };
  
  // 创建新房间
  const createNewRoom = async (roomData) => {
    if (!user) throw new Error('用户未登录');
    
    try {
      setLoading(true);
      setError(null);
      
      // 生成房间ID
      const roomId = generateRoomId();
      
      // 创建房间
      const newRoom = await createRoom({
        ...roomData,
        roomId,
        hostId: user.id,
        status: 'waiting',
        active: true,
      });
      
      // 主持人加入房间
      await joinRoom(roomId, user.id, user.get('nickname') || '主持人', true);
      
      // 保存房间信息
      setCurrentRoom(newRoom);
      saveToLocalStorage('currentRoom', newRoom);
      
      // 加载房间数据
      await loadRoomData(roomId);
      
      return newRoom;
    } catch (err) {
      console.error('创建房间失败:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 加入房间
  const joinExistingRoom = async (roomId) => {
    if (!user) throw new Error('用户未登录');
    
    try {
      setLoading(true);
      setError(null);
      
      // 查找房间
      const roomData = await findRoomById(roomId);
      if (!roomData) {
        throw new Error('房间不存在或已关闭');
      }
      
      // 加入房间
      const isHost = roomData.hostId === user.id;
      await joinRoom(roomId, user.id, user.get('nickname') || '参与者', isHost);
      
      // 保存房间信息
      setCurrentRoom(roomData);
      saveToLocalStorage('currentRoom', roomData);
      
      // 加载房间数据
      await loadRoomData(roomId);
      
      return roomData;
    } catch (err) {
      console.error('加入房间失败:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 发送消息
  const sendRoomMessage = async (content, type = 'question', imageUrl = null) => {
    if (!user || !currentRoom) throw new Error('用户未登录或房间不存在');
    
    try {
      setLoading(true);
      
      const messageData = {
        roomId: currentRoom.roomId,
        type,
        from: user.id,
        fromName: user.get('nickname') || '匿名用户',
        content,
        imageUrl,
        timestamp: new Date(),
      };
      
      // 存储消息到数据库
      const newMessage = await sendMessage(messageData);
      
      // 更新本地消息列表
      setMessages(prev => [...prev, newMessage]);
      
      // 通过实时通信推送消息给所有用户
      if (connected) {
        try {
          // 发送一个简化版的消息以避免可能的序列化问题
          const rtMessage = {
            type: newMessage.type,
            content: newMessage.content,
            from: newMessage.from,
            fromName: newMessage.fromName,
            timestamp: newMessage.timestamp || new Date().toISOString(),
            imageUrl: newMessage.imageUrl,
            roomId: newMessage.roomId
          };
          await sendRealtimeMessage(rtMessage);
        } catch (rtError) {
          console.error('实时消息推送失败:', rtError);
          // 即使实时推送失败，也继续返回成功，因为消息已经保存到数据库
        }
      }
      
      return newMessage;
    } catch (err) {
      console.error('发送消息失败:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 更新房间状态
  const updateRoom = async (status) => {
    if (!user || !currentRoom) throw new Error('用户未登录或房间不存在');
    
    try {
      setLoading(true);
      
      const updatedRoom = await updateRoomStatus(currentRoom.roomId, status);
      
      // 更新房间状态
      setCurrentRoom(updatedRoom);
      saveToLocalStorage('currentRoom', updatedRoom);
      
      return updatedRoom;
    } catch (err) {
      console.error('更新房间状态失败:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 结束房间
  const endCurrentRoom = async () => {
    if (!user || !currentRoom) throw new Error('用户未登录或房间不存在');
    
    try {
      setLoading(true);
      
      await endRoom(currentRoom.roomId);
      
      // 清除房间数据
      setCurrentRoom(null);
      setParticipants([]);
      setMessages([]);
      removeFromLocalStorage('currentRoom');
      
      return true;
    } catch (err) {
      console.error('结束房间失败:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 离开房间 - 清除所有房间相关数据
  const leaveRoom = async () => {
    console.log('开始离开房间...');
    
    if (!user || !currentRoom) {
      // 如果没有用户或房间信息，只清除本地数据
      console.log('无用户或房间信息，仅清除本地数据');
      setCurrentRoom(null);
      setParticipants([]);
      setMessages([]);
      removeFromLocalStorage('currentRoom');
      return;
    }
    
    try {
      // 从数据库中删除参与者记录
      await removeParticipant(currentRoom.roomId, user.id);
      console.log('已从数据库删除参与者记录');
    } catch (error) {
      console.error('删除参与者记录失败:', error);
      // 即使删除失败，也继续清除本地数据
    }
    
    // 清除本地房间数据
    setCurrentRoom(null);
    setParticipants([]);
    setMessages([]);
    removeFromLocalStorage('currentRoom');
    
    console.log('房间数据清理完成');
  };
  
  // 添加新消息（用于实时接收）
  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };
  
  // 添加或更新参与者
  const updateParticipant = (participant) => {
    setParticipants(prev => {
      const exists = prev.find(p => p.userId === participant.userId);
      if (exists) {
        return prev.map(p => p.userId === participant.userId ? participant : p);
      } else {
        return [...prev, participant];
      }
    });
  };
  
  const value = {
    currentRoom,
    participants,
    messages,
    loading,
    error,
    createRoom: createNewRoom,
    joinRoom: joinExistingRoom,
    sendMessage: sendRoomMessage,
    updateRoom,
    endRoom: endCurrentRoom,
    leaveRoom,
    loadRoomData,
    addMessage,
    updateParticipant,
    isHost: currentRoom && user ? currentRoom.hostId === user.id : false,
  };
  
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom 必须在 RoomProvider 内部使用');
  }
  return context;
};

export default RoomContext;