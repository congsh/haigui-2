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

/**
 * 匿名登录 - 允许昵称重复
 * @param {string} nickname - 用户昵称
 * @returns {Promise<Object>} 用户对象
 */
export const loginAnonymously = async (nickname) => {
  try {
    // 创建随机邮箱和密码，确保用户名唯一性
    const randomId = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now();
    const email = `anonymous_${randomId}_${timestamp}@haigui.com`;
    const password = Math.random().toString(36).substring(2, 15);
    
    // 创建新用户，用户名使用随机ID确保唯一性，但昵称可以重复
    const user = new AV.User();
    user.setUsername(`user_${randomId}_${timestamp}`); // 用户名唯一
    user.setPassword(password);
    user.setEmail(email);
    
    // 设置昵称（允许重复）
    const finalNickname = nickname || `游客${randomId.substring(0, 4)}`;
    user.set('nickname', finalNickname);
    
    // 注册用户
    const newUser = await user.signUp();
    console.log('用户注册成功，昵称:', finalNickname);
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

/**
 * 退出登录 - 清除所有缓存数据
 * @returns {Promise<boolean>} 是否成功退出
 */
export const logout = async () => {
  try {
    // 清理实时通信缓存
    clearRealtimeCache();
    
    // 退出登录
    await AV.User.logOut();
    
    console.log('用户已退出登录，缓存已清理');
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

/**
 * 结束房间 - 删除房间及所有相关数据
 * @param {string} roomId - 房间ID
 * @returns {Promise<Object>} 房间对象
 */
export const endRoom = async (roomId) => {
  try {
    console.log('开始清理房间数据:', roomId);
    
    // 1. 获取房间信息
    const roomQuery = new AV.Query('Room');
    roomQuery.equalTo('roomId', roomId);
    const room = await roomQuery.first();
    
    if (!room) {
      throw new Error('房间不存在');
    }
    
    // 2. 删除所有参与者记录
    try {
      const participantQuery = new AV.Query('Participant');
      participantQuery.equalTo('roomId', roomId);
      const participants = await participantQuery.find();
      
      if (participants.length > 0) {
        await AV.Object.destroyAll(participants);
        console.log(`已删除 ${participants.length} 个参与者记录`);
      }
    } catch (error) {
      console.warn('删除参与者记录失败:', error);
    }
    
    // 3. 删除所有聊天消息
    try {
      const messageQuery = new AV.Query('Message');
      messageQuery.equalTo('roomId', roomId);
      const messages = await messageQuery.find();
      
      if (messages.length > 0) {
        // 删除消息中的图片文件
        for (const message of messages) {
          const imageUrl = message.get('imageUrl');
          if (imageUrl) {
            try {
              await deleteImage(imageUrl);
            } catch (imgError) {
              console.warn('删除消息图片失败:', imgError);
            }
          }
        }
        
        await AV.Object.destroyAll(messages);
        console.log(`已删除 ${messages.length} 条聊天记录`);
      }
    } catch (error) {
      console.warn('删除聊天记录失败:', error);
    }
    
    // 4. 删除房间封面图片
    try {
      const imageUrl = room.get('imageUrl');
      if (imageUrl) {
        await deleteImage(imageUrl);
        console.log('已删除房间封面图片');
      }
    } catch (error) {
      console.warn('删除房间图片失败:', error);
    }
    
    // 5. 删除房间记录
    const roomData = room.toJSON();
    await room.destroy();
    console.log('房间数据清理完成:', roomId);
    
    // 6. 清理实时通信缓存中的相关对话
    const conversationKey = `Room-${roomId}`;
    if (cachedConversations.has(conversationKey)) {
      cachedConversations.delete(conversationKey);
      console.log('已清理实时对话缓存');
    }
    
    return roomData;
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

/**
 * 清理实时通信缓存
 * 在用户登出或需要重置连接时调用
 */
export const clearRealtimeCache = () => {
  try {
    // 关闭现有客户端连接
    if (cachedClient && typeof cachedClient.close === 'function') {
      cachedClient.close();
    }
  } catch (error) {
    console.warn('关闭实时客户端失败:', error);
  }
  
  cachedClient = null;
  cachedConversations.clear();
  console.log('已清理实时通信缓存');
};

// ==================== 定时清理功能 ====================

/**
 * 查找过期房间（48小时未更新）
 * @returns {Promise<Array>} 过期房间列表
 */
export const findExpiredRooms = async () => {
  try {
    const expireTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48小时前
    
    const query = new AV.Query('Room');
    query.lessThan('updatedAt', expireTime);
    query.limit(100); // 每次最多处理100个房间
    
    const expiredRooms = await query.find();
    console.log(`找到 ${expiredRooms.length} 个过期房间`);
    
    return expiredRooms.map(room => room.toJSON());
  } catch (error) {
    console.error('查找过期房间失败:', error);
    throw error;
  }
};

/**
 * 查找过期用户（48小时未登录）
 * @returns {Promise<Array>} 过期用户列表
 */
export const findExpiredUsers = async () => {
  try {
    const expireTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48小时前
    
    const query = new AV.Query('_User');
    query.lessThan('updatedAt', expireTime);
    query.startsWith('username', 'user_'); // 只查找匿名用户
    query.limit(100); // 每次最多处理100个用户
    
    const expiredUsers = await query.find();
    console.log(`找到 ${expiredUsers.length} 个过期用户`);
    
    return expiredUsers.map(user => user.toJSON());
  } catch (error) {
    console.error('查找过期用户失败:', error);
    throw error;
  }
};

/**
 * 清理单个过期房间的所有数据
 * @param {string} roomId - 房间ID
 * @returns {Promise<boolean>} 是否清理成功
 */
export const cleanupExpiredRoom = async (roomId) => {
  try {
    console.log('开始清理过期房间:', roomId);
    
    // 复用现有的endRoom函数，它已经包含了完整的清理逻辑
    await endRoom(roomId);
    
    console.log('过期房间清理完成:', roomId);
    return true;
  } catch (error) {
    console.error('清理过期房间失败:', roomId, error);
    return false;
  }
};

/**
 * 清理单个过期用户的所有数据
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} 是否清理成功
 */
export const cleanupExpiredUser = async (userId) => {
  try {
    console.log('开始清理过期用户:', userId);
    
    // 1. 删除用户的参与者记录
    try {
      const participantQuery = new AV.Query('Participant');
      participantQuery.equalTo('userId', userId);
      const participants = await participantQuery.find();
      
      if (participants.length > 0) {
        await AV.Object.destroyAll(participants);
        console.log(`已删除用户 ${userId} 的 ${participants.length} 个参与者记录`);
      }
    } catch (error) {
      console.warn('删除用户参与者记录失败:', error);
    }
    
    // 2. 删除用户发送的消息
    try {
      const messageQuery = new AV.Query('Message');
      messageQuery.equalTo('from', userId);
      const messages = await messageQuery.find();
      
      if (messages.length > 0) {
        // 删除消息中的图片文件
        for (const message of messages) {
          const imageUrl = message.get('imageUrl');
          if (imageUrl) {
            try {
              await deleteImage(imageUrl);
            } catch (imgError) {
              console.warn('删除用户消息图片失败:', imgError);
            }
          }
        }
        
        await AV.Object.destroyAll(messages);
        console.log(`已删除用户 ${userId} 的 ${messages.length} 条消息`);
      }
    } catch (error) {
      console.warn('删除用户消息失败:', error);
    }
    
    // 3. 删除用户创建的房间
    try {
      const roomQuery = new AV.Query('Room');
      roomQuery.equalTo('hostId', userId);
      const rooms = await roomQuery.find();
      
      for (const room of rooms) {
        try {
          await cleanupExpiredRoom(room.get('roomId'));
        } catch (roomError) {
          console.warn('删除用户房间失败:', roomError);
        }
      }
      
      if (rooms.length > 0) {
        console.log(`已删除用户 ${userId} 创建的 ${rooms.length} 个房间`);
      }
    } catch (error) {
      console.warn('删除用户房间失败:', error);
    }
    
    // 4. 删除用户记录
    try {
      const userQuery = new AV.Query('_User');
      const user = await userQuery.get(userId);
      if (user) {
        await user.destroy();
        console.log('已删除用户记录:', userId);
      }
    } catch (error) {
      console.warn('删除用户记录失败:', error);
    }
    
    console.log('过期用户清理完成:', userId);
    return true;
  } catch (error) {
    console.error('清理过期用户失败:', userId, error);
    return false;
  }
};

/**
 * 批量清理过期房间
 * @returns {Promise<Object>} 清理结果统计
 */
export const cleanupExpiredRooms = async () => {
  try {
    console.log('开始批量清理过期房间...');
    
    const expiredRooms = await findExpiredRooms();
    let successCount = 0;
    let failCount = 0;
    
    for (const room of expiredRooms) {
      const success = await cleanupExpiredRoom(room.roomId);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // 添加延迟避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const result = {
      total: expiredRooms.length,
      success: successCount,
      failed: failCount,
      timestamp: new Date().toISOString()
    };
    
    console.log('过期房间清理完成:', result);
    return result;
  } catch (error) {
    console.error('批量清理过期房间失败:', error);
    throw error;
  }
};

/**
 * 批量清理过期用户
 * @returns {Promise<Object>} 清理结果统计
 */
export const cleanupExpiredUsers = async () => {
  try {
    console.log('开始批量清理过期用户...');
    
    const expiredUsers = await findExpiredUsers();
    let successCount = 0;
    let failCount = 0;
    
    for (const user of expiredUsers) {
      const success = await cleanupExpiredUser(user.objectId);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // 添加延迟避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const result = {
      total: expiredUsers.length,
      success: successCount,
      failed: failCount,
      timestamp: new Date().toISOString()
    };
    
    console.log('过期用户清理完成:', result);
    return result;
  } catch (error) {
    console.error('批量清理过期用户失败:', error);
    throw error;
  }
};

/**
 * 执行完整的清理任务
 * @returns {Promise<Object>} 清理结果统计
 */
export const runCleanupTask = async () => {
  try {
    console.log('开始执行定时清理任务...');
    
    const startTime = Date.now();
    
    // 并行执行房间和用户清理
    const [roomResult, userResult] = await Promise.allSettled([
      cleanupExpiredRooms(),
      cleanupExpiredUsers()
    ]);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const result = {
      duration: `${duration}ms`,
      rooms: roomResult.status === 'fulfilled' ? roomResult.value : { error: roomResult.reason?.message },
      users: userResult.status === 'fulfilled' ? userResult.value : { error: userResult.reason?.message },
      timestamp: new Date().toISOString()
    };
    
    console.log('定时清理任务完成:', result);
    return result;
  } catch (error) {
    console.error('执行清理任务失败:', error);
    throw error;
  }
};

// 定时任务管理
let cleanupInterval = null;

/**
 * 启动定时清理任务
 * @param {number} intervalHours - 清理间隔（小时），默认24小时
 * @returns {boolean} 是否启动成功
 */
export const startCleanupSchedule = (intervalHours = 24) => {
  try {
    // 如果已有定时任务，先停止
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
    
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    // 立即执行一次清理
    runCleanupTask().catch(error => {
      console.error('初始清理任务失败:', error);
    });
    
    // 设置定时任务
    cleanupInterval = setInterval(() => {
      runCleanupTask().catch(error => {
        console.error('定时清理任务失败:', error);
      });
    }, intervalMs);
    
    console.log(`定时清理任务已启动，间隔: ${intervalHours} 小时`);
    return true;
  } catch (error) {
    console.error('启动定时清理任务失败:', error);
    return false;
  }
};

/**
 * 停止定时清理任务
 * @returns {boolean} 是否停止成功
 */
export const stopCleanupSchedule = () => {
  try {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
      console.log('定时清理任务已停止');
      return true;
    }
    console.log('没有运行中的定时清理任务');
    return true;
  } catch (error) {
    console.error('停止定时清理任务失败:', error);
    return false;
  }
};

/**
 * 获取定时清理任务状态
 * @returns {Object} 任务状态信息
 */
export const getCleanupScheduleStatus = () => {
  return {
    isRunning: cleanupInterval !== null,
    intervalId: cleanupInterval,
    timestamp: new Date().toISOString()
  };
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