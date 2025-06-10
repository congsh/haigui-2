# LeanCloud 使用指南

## 1. 注册与创建应用

### 1.1 注册账号
1. 访问 [LeanCloud官网](https://www.leancloud.cn/)
2. 点击右上角的"注册"按钮
3. 填写邮箱、密码等信息完成注册
4. 验证邮箱

### 1.2 创建应用
1. 登录LeanCloud控制台
2. 点击"创建应用"按钮
3. 输入应用名称（如"海龟汤游戏"）
4. 选择开发版（免费）
5. 点击"创建"按钮

### 1.3 获取应用凭证
1. 在应用列表中找到刚创建的应用
2. 点击"设置" > "应用凭证"
3. 记录以下信息：
   - App ID
   - App Key
   - REST API服务器地址

## 2. 安装与初始化

### 2.1 安装SDK
在React项目中安装LeanCloud SDK：

```bash
# 使用npm
npm install leancloud-storage

# 或使用yarn
yarn add leancloud-storage
```

### 2.2 初始化SDK
在项目入口文件（如`src/index.js`或`src/App.js`）中初始化SDK：

```javascript
import AV from 'leancloud-storage';

// 初始化
AV.init({
  appId: "你的App ID",
  appKey: "你的App Key",
  serverURL: "你的REST API服务器地址"
});
```

## 3. 基本数据操作

### 3.1 创建对象
创建一个新的房间对象：

```javascript
// 创建Room类的实例
const Room = AV.Object.extend('Room');
const room = new Room();

// 设置属性
room.set('roomId', generateRoomId()); // 生成随机房间ID
room.set('hostId', currentUser.id);
room.set('title', '谜题的汤面');
room.set('titleIsImage', false);
room.set('solution', '谜题的答案');
room.set('solutionIsImage', false);
room.set('rules', { freeQuestion: true, allowFlowers: true });
room.set('status', 'waiting');
room.set('active', true);

// 保存对象
room.save().then((room) => {
  console.log('创建房间成功，房间ID:', room.id);
}, (error) => {
  console.error('创建房间失败:', error);
});
```

### 3.2 查询对象
查询特定房间：

```javascript
// 创建查询
const query = new AV.Query('Room');

// 根据roomId查询
query.equalTo('roomId', inviteCode);

// 执行查询
query.first().then((room) => {
  if (room) {
    console.log('找到房间:', room.toJSON());
    // 处理房间数据
  } else {
    console.log('未找到房间');
  }
}, (error) => {
  console.error('查询失败:', error);
});
```

### 3.3 更新对象
更新房间状态：

```javascript
// 先查询要更新的对象
const query = new AV.Query('Room');
query.get(roomId).then((room) => {
  // 更新属性
  room.set('status', 'active');
  
  // 保存更新
  return room.save();
}).then((updatedRoom) => {
  console.log('房间状态已更新');
}, (error) => {
  console.error('更新失败:', error);
});
```

### 3.4 删除对象
删除消息：

```javascript
// 先查询要删除的对象
const query = new AV.Query('Message');
query.get(messageId).then((message) => {
  // 删除对象
  return message.destroy();
}).then(() => {
  console.log('消息已删除');
}, (error) => {
  console.error('删除失败:', error);
});
```

### 3.5 批量操作
批量创建参与者：

```javascript
// 创建多个对象
const participants = [];
for (let i = 0; i < userList.length; i++) {
  const Participant = AV.Object.extend('Participant');
  const participant = new Participant();
  participant.set('roomId', roomId);
  participant.set('userId', userList[i].id);
  participant.set('nickname', userList[i].nickname);
  participant.set('isHost', false);
  participant.set('joinedAt', new Date());
  participants.push(participant);
}

// 批量保存
AV.Object.saveAll(participants).then((savedParticipants) => {
  console.log('批量创建参与者成功');
}, (error) => {
  console.error('批量创建失败:', error);
});
```

## 4. 文件存储

### 4.1 上传图片

```javascript
// 将图片转换为File对象
function dataURLtoFile(dataURL, filename) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// 上传图片
const file = dataURLtoFile(imageBase64, 'title-image.png');
const avFile = new AV.File('title-image.png', file);

avFile.save().then((savedFile) => {
  console.log('图片上传成功，URL:', savedFile.url());
  
  // 将图片URL保存到房间对象
  const Room = AV.Object.extend('Room');
  const room = new Room();
  room.id = roomId;
  room.set('titleImage', savedFile.url());
  room.set('titleIsImage', true);
  return room.save();
}).then(() => {
  console.log('房间图片已更新');
}, (error) => {
  console.error('操作失败:', error);
});
```

### 4.2 删除图片

```javascript
// 获取要删除的文件
const query = new AV.Query('_File');
query.equalTo('url', fileUrl);
query.first().then((file) => {
  if (file) {
    // 删除文件
    return file.destroy();
  }
}).then(() => {
  console.log('文件已删除');
}, (error) => {
  console.error('删除文件失败:', error);
});
```

## 5. 实时数据同步

LeanCloud提供了实时数据功能，可以实现类似于Firebase实时数据库的功能。

### 5.1 安装实时通信SDK

```bash
# 使用npm
npm install leancloud-realtime

# 或使用yarn
yarn add leancloud-realtime
```

### 5.2 初始化实时通信

```javascript
import { Realtime } from 'leancloud-realtime';

// 创建实时通信实例
const realtime = new Realtime({
  appId: '你的App ID',
  appKey: '你的App Key',
  server: '你的实时通信服务器地址'
});
```

### 5.3 创建和加入对话

```javascript
// 创建客户端
realtime.createIMClient(userId).then((client) => {
  // 创建或加入对话
  return client.createConversation({
    members: [hostId, ...participantIds],
    name: `Room-${roomId}`,
    transient: false,
    unique: true
  });
}).then((conversation) => {
  console.log('成功创建/加入对话:', conversation.id);
  
  // 监听消息
  conversation.on('message', (message) => {
    console.log('收到消息:', message);
    // 处理消息
  });
  
  // 发送消息
  return conversation.send({
    type: 'question',
    content: '这是一个问题',
    from: userId,
    fromName: nickname
  });
}).then(() => {
  console.log('消息发送成功');
}).catch(console.error);
```

### 5.4 监听在线状态

```javascript
// 监听参与者在线状态
client.ping([...participantIds]).then((result) => {
  console.log('在线用户:', result);
});
```

## 6. 权限控制

### 6.1 使用ACL控制访问权限

```javascript
// 创建ACL
const roomACL = new AV.ACL();

// 设置创建者权限
roomACL.setWriteAccess(hostId, true);
roomACL.setReadAccess(hostId, true);

// 为参与者设置只读权限
participantIds.forEach((participantId) => {
  roomACL.setReadAccess(participantId, true);
});

// 将ACL应用到对象
room.setACL(roomACL);
room.save().then((room) => {
  console.log('已设置权限');
}, (error) => {
  console.error('设置权限失败:', error);
});
```

### 6.2 角色权限

```javascript
// 创建角色
const roleACL = new AV.ACL();
roleACL.setPublicReadAccess(true);

const hostRole = new AV.Role('Host-' + roomId, roleACL);
const participantRole = new AV.Role('Participant-' + roomId, roleACL);

// 保存角色
Promise.all([hostRole.save(), participantRole.save()]).then(() => {
  // 为角色添加用户
  const hostRelation = hostRole.getUsers();
  hostRelation.add(AV.Object.createWithoutData('_User', hostId));
  
  const participantRelation = participantRole.getUsers();
  participantIds.forEach((id) => {
    participantRelation.add(AV.Object.createWithoutData('_User', id));
  });
  
  return Promise.all([hostRole.save(), participantRole.save()]);
}).then(() => {
  console.log('角色设置完成');
}).catch(console.error);
```

## 7. 用户管理

### 7.1 匿名用户登录

```javascript
// 创建匿名用户
AV.User.loginAnonymously().then((user) => {
  console.log('匿名登录成功，用户ID:', user.id);
}, (error) => {
  console.error('匿名登录失败:', error);
});
```

### 7.2 设置用户信息

```javascript
// 获取当前用户
const currentUser = AV.User.current();
if (currentUser) {
  // 设置昵称
  currentUser.set('nickname', nickname);
  currentUser.save().then(() => {
    console.log('用户信息已更新');
  }, (error) => {
    console.error('更新用户信息失败:', error);
  });
}
```

## 8. 云函数

对于一些需要在服务端执行的逻辑，可以使用LeanCloud云函数。

### 8.1 定义云函数

在LeanCloud控制台的"云引擎" > "云函数"中创建函数：

```javascript
// 清理过期房间的云函数
AV.Cloud.define('cleanExpiredRooms', async (request) => {
  // 获取24小时前的时间
  const expireTime = new Date();
  expireTime.setHours(expireTime.getHours() - 24);
  
  // 查询过期的房间
  const query = new AV.Query('Room');
  query.lessThan('updatedAt', expireTime);
  query.equalTo('active', true);
  
  // 标记为非活跃
  const rooms = await query.find();
  for (const room of rooms) {
    room.set('active', false);
  }
  
  // 批量保存
  await AV.Object.saveAll(rooms);
  
  return {
    success: true,
    cleanedCount: rooms.length
  };
});
```

### 8.2 调用云函数

```javascript
// 调用云函数
AV.Cloud.run('cleanExpiredRooms').then((result) => {
  console.log('清理结果:', result);
}, (error) => {
  console.error('清理失败:', error);
});
```

## 9. 常见问题与解决方案

### 9.1 请求频率限制
LeanCloud免费版有API请求频率限制，如果遇到"429错误"，可以：
- 减少不必要的请求
- 使用批量操作代替多次单独操作
- 考虑升级到商用版

### 9.2 数据安全
- 始终使用ACL控制数据访问权限
- 不要在客户端存储敏感信息
- 使用云函数处理敏感操作

### 9.3 实时数据同步性能
- 避免过大的数据结构
- 只监听必要的数据变化
- 考虑使用分页加载大量数据

## 10. 资源与参考

- [LeanCloud官方文档](https://leancloud.cn/docs/)
- [JavaScript SDK 文档](https://leancloud.cn/docs/leanstorage_guide-js.html)
- [实时通信 SDK 文档](https://leancloud.cn/docs/realtime_v2.html)
- [云引擎文档](https://leancloud.cn/docs/leanengine_overview.html)
- [数据安全指南](https://leancloud.cn/docs/data_security.html) 