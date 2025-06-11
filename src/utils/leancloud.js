import AV from 'leancloud-storage';
import { Realtime, TextMessage } from 'leancloud-realtime';

// LeanCloud 配置
// 在实际项目中，这些值应该从环境变量中读取
const APP_ID = '5zutWSDruhDv1dFtfnvQDm7E-gzGzoHsz';
const APP_KEY = 'rFGC2dPnbrFSMCmwOUJBXQG5';
const SERVER_URL = 'https://5zutwsdr.lc-cn-n1-shared.com';

// 初始化 LeanCloud 存储 SDK
AV.init({
  appId: APP_ID,
  appKey: APP_KEY,
  serverURL: SERVER_URL,
});

// 配置请求超时和错误重试
AV._config.requestTimeout = 30000; // 30秒超时
AV._config.disableCurrentUser = false;

// 初始化 LeanCloud 实时通信 SDK
const realtime = new Realtime({
  appId: APP_ID,
  appKey: APP_KEY,
  server: SERVER_URL,
  retryPolicy: {
    maxRetryTimes: 3, // 最多重试3次
    retryDelay: 1000, // 初始延迟1秒
  }
});

// 匿名登录
export const loginAnonymously = async (nickname) => {
  try {
    // 创建随机邮箱和密码
    const randomId = Math.random().toString(36).substring(2, 10);
    const email = `anonymous_${randomId}@haigui.com`;
    const password = Math.random().toString(36).substring(2, 15);
    
    // 创建新用户
    const user = new AV.User();
    user.setUsername(nickname || `游客${randomId.substring(0, 4)}`);
    user.setPassword(password);
    user.setEmail(email);
    
    // 设置昵称
    user.set('nickname', nickname || `游客${randomId.substring(0, 4)}`);
    
    // 注册用户
    const newUser = await user.signUp();
    return newUser;
  } catch (error) {
    console.error('匿名登录失败:', error);
    throw error;
  }
};

// 获取当前用户
export const getCurrentUser = () => {
  return AV.User.current();
};

// 退出登录
export const logout = async () => {
  try {
    await AV.User.logOut();
    return true;
  } catch (error) {
    console.error('退出登录失败:', error);
    throw error;
  }
};

// 创建新房间
export const createRoom = async (roomData) => {
  try {
    const Room = AV.Object.extend('Room');
    const room = new Room();
    
    // 设置房间数据
    Object.keys(roomData).forEach(key => {
      room.set(key, roomData[key]);
    });
    
    // 设置创建者
    const currentUser = AV.User.current();
    room.set('hostId', currentUser.id);
    
    // 设置ACL
    const roomACL = new AV.ACL();
    roomACL.setPublicReadAccess(true);
    roomACL.setWriteAccess(currentUser.id, true);
    room.setACL(roomACL);
    
    // 保存房间
    await room.save();
    return room.toJSON();
  } catch (error) {
    console.error('创建房间失败:', error);
    throw error;
  }
};

// 根据房间ID查找房间
export const findRoomById = async (roomId) => {
  let retries = 0;
  const maxRetries = 3;
  
  const tryFind = async () => {
    try {
      const query = new AV.Query('Room');
      query.equalTo('roomId', roomId);
      query.equalTo('active', true);
      
      const room = await query.first();
      return room ? room.toJSON() : null;
    } catch (error) {
      console.error('查找房间失败:', error);
      
      // 如果是网络错误或超时，尝试重试
      if ((error.message.includes('network') || 
           error.message.includes('terminated') || 
           error.message.includes('timeout') || 
           error.code === 31) && retries < maxRetries) {
        retries++;
        console.log(`尝试重新查找房间 (${retries}/${maxRetries})...`);
        // 延迟1秒后重试
        return new Promise(resolve => {
          setTimeout(async () => {
            const result = await tryFind();
            resolve(result);
          }, 1000 * retries); // 递增延迟
        });
      }
      
      throw error;
    }
  };
  
  return tryFind();
};

// 加入房间
export const joinRoom = async (roomId, userId, nickname, isHost = false) => {
  try {
    // 检查是否已经是参与者
    const existingQuery = new AV.Query('Participant');
    existingQuery.equalTo('roomId', roomId);
    existingQuery.equalTo('userId', userId);
    const existingParticipant = await existingQuery.first();
    
    if (existingParticipant) {
      // 如果已经是参与者，更新最后活跃时间
      existingParticipant.set('lastActive', new Date());
      await existingParticipant.save();
      return existingParticipant.toJSON();
    }
    
    const Participant = AV.Object.extend('Participant');
    const participant = new Participant();
    
    participant.set('roomId', roomId);
    participant.set('userId', userId);
    participant.set('nickname', nickname);
    participant.set('isHost', isHost);
    participant.set('joinedAt', new Date());
    participant.set('lastActive', new Date());
    
    // 设置ACL
    const participantACL = new AV.ACL();
    participantACL.setPublicReadAccess(true);
    participantACL.setWriteAccess(userId, true);
    participant.setACL(participantACL);
    
    await participant.save();
    const participantData = participant.toJSON();
    
    // 发送参与者加入的实时通知
    try {
      const joinMessage = {
        type: 'participant_join',
        roomId: roomId,
        participant: participantData,
        timestamp: new Date().toISOString()
      };
      
      // 通过实时通信通知其他参与者
      await sendRealtimeNotification(roomId, joinMessage);
    } catch (realtimeError) {
      console.warn('发送参与者加入通知失败:', realtimeError);
      // 不影响主要的加入房间流程
    }
    
    return participantData;
  } catch (error) {
    console.error('加入房间失败:', error);
    throw error;
  }
};

// 获取房间参与者
export const getRoomParticipants = async (roomId) => {
  try {
    const query = new AV.Query('Participant');
    query.equalTo('roomId', roomId);
    query.addDescending('joinedAt');
    const participants = await query.find();
    return participants.map(p => p.toJSON());
  } catch (error) {
    console.error('获取参与者失败:', error);
    throw error;
  }
};

// 离开房间（删除参与者记录）
export const removeParticipant = async (roomId, userId) => {
  try {
    const query = new AV.Query('Participant');
    query.equalTo('roomId', roomId);
    query.equalTo('userId', userId);
    const participant = await query.first();
    
    if (!participant) {
      console.warn('参与者记录不存在');
      return null;
    }
    
    const participantData = participant.toJSON();
    
    // 删除参与者记录
    await participant.destroy();
    
    // 发送参与者离开的实时通知
    try {
      const leaveMessage = {
        type: 'participant_leave',
        roomId: roomId,
        participant: participantData,
        timestamp: new Date().toISOString()
      };
      
      // 通过实时通信通知其他参与者
      await sendRealtimeNotification(roomId, leaveMessage);
    } catch (realtimeError) {
      console.warn('发送参与者离开通知失败:', realtimeError);
      // 不影响主要的离开房间流程
    }
    
    return participantData;
  } catch (error) {
    console.error('离开房间失败:', error);
    throw error;
  }
};

// 发送消息
export const sendMessage = async (messageData) => {
  try {
    const Message = AV.Object.extend('Message');
    const message = new Message();
    
    // 设置消息数据
    Object.keys(messageData).forEach(key => {
      message.set(key, messageData[key]);
    });
    
    // 设置ACL
    const messageACL = new AV.ACL();
    messageACL.setPublicReadAccess(true);
    messageACL.setWriteAccess(messageData.from, true);
    message.setACL(messageACL);
    
    await message.save();
    return message.toJSON();
  } catch (error) {
    console.error('发送消息失败:', error);
    throw error;
  }
};

// 获取房间消息历史
export const getRoomMessages = async (roomId) => {
  try {
    const query = new AV.Query('Message');
    query.equalTo('roomId', roomId);
    query.addAscending('createdAt');
    query.limit(100); // 限制消息数量
    const messages = await query.find();
    return messages.map(m => m.toJSON());
  } catch (error) {
    console.error('获取消息历史失败:', error);
    throw error;
  }
};

// 更新房间状态
export const updateRoomStatus = async (roomId, status) => {
  try {
    const query = new AV.Query('Room');
    query.equalTo('roomId', roomId);
    const room = await query.first();
    
    if (!room) {
      throw new Error('房间不存在');
    }
    
    room.set('status', status);
    await room.save();
    return room.toJSON();
  } catch (error) {
    console.error('更新房间状态失败:', error);
    throw error;
  }
};

// 结束房间
export const endRoom = async (roomId) => {
  try {
    const query = new AV.Query('Room');
    query.equalTo('roomId', roomId);
    const room = await query.first();
    
    if (!room) {
      throw new Error('房间不存在');
    }
    
    room.set('status', 'ended');
    room.set('active', false);
    await room.save();
    return room.toJSON();
  } catch (error) {
    console.error('结束房间失败:', error);
    throw error;
  }
};

// 上传图片
export const uploadImage = async (file, fileName) => {
  let retries = 0;
  const maxRetries = 3;
  
  const tryUpload = async () => {
    try {
      const avFile = new AV.File(fileName, file);
      await avFile.save({
        timeout: 30000, // 30秒超时
      });
      return avFile.url();
    } catch (error) {
      console.error('上传图片失败:', error);
      
      // 如果是网络错误或超时，尝试重试
      if ((error.message.includes('network') || error.message.includes('timeout') || error.code === 31) && retries < maxRetries) {
        retries++;
        console.log(`尝试重新上传 (${retries}/${maxRetries})...`);
        // 延迟1秒后重试
        return new Promise(resolve => {
          setTimeout(async () => {
            const result = await tryUpload();
            resolve(result);
          }, 1000);
        });
      }
      
      throw error;
    }
  };
  
  return tryUpload();
};

// 删除图片
export const deleteImage = async (url) => {
  let retries = 0;
  const maxRetries = 3;
  
  const tryDelete = async () => {
    try {
      // 从URL提取文件名
      const fileName = url.substring(url.lastIndexOf('/') + 1);
      
      // 查询文件
      const query = new AV.Query('_File');
      query.equalTo('name', fileName);
      const file = await query.first();
      
      if (file) {
        await file.destroy();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('删除图片失败:', error);
      
      // 如果是网络错误或超时，尝试重试
      if ((error.message.includes('network') || error.message.includes('timeout') || error.code === 31) && retries < maxRetries) {
        retries++;
        console.log(`尝试重新删除 (${retries}/${maxRetries})...`);
        // 延迟1秒后重试
        return new Promise(resolve => {
          setTimeout(async () => {
            const result = await tryDelete();
            resolve(result);
          }, 1000);
        });
      }
      
      throw error;
    }
  };
  
  return tryDelete();
};

// 创建实时连接
export const createRealtimeConnection = async (userId) => {
  try {
    // 确保用户已登录
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录，无法建立实时连接');
    }
    
    // 直接使用用户对象创建实时连接
    const client = await realtime.createIMClient(currentUser);
    
    return client;
  } catch (error) {
    console.error('创建实时连接失败:', error);
    throw error;
  }
};

// 创建或加入实时对话
export const joinRealtimeConversation = async (client, roomId, participants) => {
  try {
    let conversation;
    try {
      // 通过查询查找现有对话
      const query = client.getQuery();
      query.equalTo('name', `Room-${roomId}`);
      const conversations = await query.find();
      
      if (conversations.length > 0) {
        conversation = conversations[0];
        console.log('找到现有对话:', conversation.id);
        return conversation;
      }
    } catch (error) {
      console.log('查找对话失败，将创建新对话:', error.message);
    }
    
    // 如果没有找到现有对话，创建新的
     conversation = await client.createConversation({
       name: `Room-${roomId}`,
       members: participants,
       unique: true,
     });
     console.log('创建新对话成功:', conversation.id);
     return conversation;
  } catch (error) {
    console.error('加入实时对话失败:', error);
    throw error;
  }
};

// 发送实时消息
export const sendRealtimeMessage = async (conversation, messageData) => {
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
  } catch (error) {
    console.error('发送实时消息失败:', error);
    throw error;
  }
};

// 缓存实时客户端和对话，避免重复创建
let cachedClient = null;
let cachedConversations = new Map();

/**
 * 获取或创建实时客户端
 * @param {Object} user - 当前用户
 * @returns {Promise<Object>} 实时客户端
 */
const getOrCreateClient = async (user) => {
  if (!cachedClient || cachedClient.id !== user.id) {
    cachedClient = await realtime.createIMClient(user);
  }
  return cachedClient;
};

/**
 * 获取或创建对话
 * @param {Object} client - 实时客户端
 * @param {string} roomId - 房间ID
 * @param {Array} memberIds - 成员ID列表
 * @returns {Promise<Object>} 对话对象
 */
const getOrCreateConversation = async (client, roomId, memberIds) => {
  const conversationKey = `Room-${roomId}`;
  
  // 检查缓存
  if (cachedConversations.has(conversationKey)) {
    const conversation = cachedConversations.get(conversationKey);
    try {
      // 确保所有成员都在对话中
      const newMembers = memberIds.filter(id => !conversation.members.includes(id));
      if (newMembers.length > 0) {
        await conversation.add(newMembers);
        console.log('已更新对话成员列表');
      }
      return conversation;
    } catch (error) {
      console.log('使用缓存对话失败，重新查找:', error.message);
      cachedConversations.delete(conversationKey);
    }
  }
  
  // 查找现有对话
  try {
    const query = client.getQuery();
    query.equalTo('name', conversationKey);
    const conversations = await query.find();
    
    if (conversations.length > 0) {
      const conversation = conversations[0];
      cachedConversations.set(conversationKey, conversation);
      console.log('找到现有对话:', conversation.id);
      
      // 确保所有成员都在对话中
      try {
        const newMembers = memberIds.filter(id => !conversation.members.includes(id));
        if (newMembers.length > 0) {
          await conversation.add(newMembers);
          console.log('已更新对话成员列表');
        }
      } catch (addError) {
        console.log('更新成员列表失败:', addError.message);
      }
      
      return conversation;
    }
  } catch (error) {
    console.log('查找对话失败:', error.message);
  }
  
  // 创建新对话
  const conversation = await client.createConversation({
    name: conversationKey,
    members: memberIds,
    unique: true,
  });
  
  cachedConversations.set(conversationKey, conversation);
  console.log('创建新对话成功:', conversation.id);
  return conversation;
};

// 发送实时通知（优化版本）
export const sendRealtimeNotification = async (roomId, notificationData) => {
  try {
    // 获取当前用户
    const currentUser = AV.User.current();
    if (!currentUser) {
      console.warn('用户未登录，无法发送实时通知');
      return;
    }
    
    // 获取或创建实时客户端
    const client = await getOrCreateClient(currentUser);
    
    // 获取房间参与者列表
    const participants = await getRoomParticipants(roomId);
    const memberIds = participants.map(p => p.userId);
    
    // 确保当前用户也在成员列表中
    if (!memberIds.includes(currentUser.id)) {
      memberIds.push(currentUser.id);
    }
    
    // 获取或创建对话
    const conversation = await getOrCreateConversation(client, roomId, memberIds);
    
    // 发送通知消息
    const messageText = JSON.stringify(notificationData);
    const message = new TextMessage(messageText);
    await conversation.send(message);
    console.log('实时通知发送成功:', notificationData.type);
    
    return true;
  } catch (error) {
    console.error('发送实时通知失败:', error);
    // 清理缓存以防止错误状态持续
    cachedClient = null;
    cachedConversations.clear();
    throw error;
  }
};

// 清理缓存的函数，可在用户登出时调用
export const clearRealtimeCache = () => {
  cachedClient = null;
  cachedConversations.clear();
  console.log('已清理实时通信缓存');
};

export default {
  AV,
  realtime,
  loginAnonymously,
  getCurrentUser,
  logout,
  createRoom,
  findRoomById,
  joinRoom,
  getRoomParticipants,
  sendMessage,
  getRoomMessages,
  updateRoomStatus,
  endRoom,
  uploadImage,
  deleteImage,
  createRealtimeConnection,
  joinRealtimeConversation,
  sendRealtimeMessage,
};