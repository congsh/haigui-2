import { nanoid } from 'nanoid';
import Compressor from 'compressorjs';

// 生成随机房间ID
export const generateRoomId = () => {
  return nanoid(6).toUpperCase();
};

// 生成邀请码
export const generateInviteCode = (roomId, roomTitle) => {
  // 创建包含房间ID和标题的简单邀请码
  const shortTitle = roomTitle.length > 10 ? roomTitle.substring(0, 10) + '...' : roomTitle;
  return `${roomId}:${encodeURIComponent(shortTitle)}`;
};

// 解析邀请码
export const parseInviteCode = (inviteCode) => {
  try {
    const [roomId, encodedTitle] = inviteCode.split(':');
    return {
      roomId,
      title: decodeURIComponent(encodedTitle || ''),
    };
  } catch (error) {
    console.error('解析邀请码失败:', error);
    return { roomId: '', title: '' };
  }
};

// 压缩图片
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.6, // 压缩质量
      maxWidth: 800, // 最大宽度
      maxHeight: 800, // 最大高度
      success(result) {
        resolve(result);
      },
      error(err) {
        console.error('图片压缩失败:', err);
        reject(err);
      },
    });
  });
};

// 将文件转换为Base64
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// 格式化时间
export const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 格式化日期
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
};

// 格式化完整日期时间
export const formatDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 复制文本到剪贴板
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('复制到剪贴板失败:', err);
    return false;
  }
};

// 限制字符串长度
export const truncateString = (str, length = 30) => {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
};

// 转义HTML字符
export const escapeHTML = (html) => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

// 判断对象是否为空
export const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

// 将数据存储到localStorage
export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('保存到localStorage失败:', error);
    return false;
  }
};

// 从localStorage获取数据
export const getFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('从localStorage获取数据失败:', error);
    return null;
  }
};

// 从localStorage删除数据
export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('从localStorage删除数据失败:', error);
    return false;
  }
};

export default {
  generateRoomId,
  generateInviteCode,
  parseInviteCode,
  compressImage,
  fileToBase64,
  formatTime,
  formatDate,
  formatDateTime,
  copyToClipboard,
  truncateString,
  escapeHTML,
  isEmptyObject,
  saveToLocalStorage,
  getFromLocalStorage,
  removeFromLocalStorage,
}; 