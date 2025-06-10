import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createRoom, 
  findRoomById, 
  joinRoom, 
  getRoomParticipants, 
  sendMessage, 
  getRoomMessages, 
  updateRoomStatus, 
  endRoom 
} from '@/utils/leancloud';
import { useAuth } from './AuthContext';
import { generateRoomId, saveToLocalStorage, getFromLocalStorage, removeFromLocalStorage } from '@/utils/helpers';

const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
    
    try {
      setLoading(true);
      
      // 获取房间信息
      const roomData = await findRoomById(roomId);
      if (roomData) {
        setCurrentRoom(roomData);
      }
      
      // 获取参与者列表
      const participantsList = await getRoomParticipants(roomId);
      setParticipants(participantsList);
      
      // 获取消息历史
      const messageHistory = await getRoomMessages(roomId);
      setMessages(messageHistory);
    } catch (err) {
      console.error('加载房间数据失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
  const sendRoomMessage = async (content, type = 'question') => {
    if (!user || !currentRoom) throw new Error('用户未登录或房间不存在');
    
    try {
      setLoading(true);
      
      const messageData = {
        roomId: currentRoom.roomId,
        type,
        from: user.id,
        fromName: user.get('nickname') || '匿名用户',
        content,
        timestamp: new Date(),
      };
      
      const newMessage = await sendMessage(messageData);
      
      // 更新消息列表
      setMessages(prev => [...prev, newMessage]);
      
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
  
  // 离开房间
  const leaveRoom = () => {
    // 清除房间数据
    setCurrentRoom(null);
    setParticipants([]);
    setMessages([]);
    removeFromLocalStorage('currentRoom');
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