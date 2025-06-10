import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from './Input';
import Button from './Button';
import { parseInviteCode } from '@/utils/helpers';

// 加入房间表单组件
const JoinRoomForm = ({
  onJoin,
  initialInviteCode = '',
  className = '',
}) => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState(initialInviteCode || '');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 验证表单
  const validateForm = () => {
    if (inviteCode) {
      // 验证邀请码
      try {
        const { roomId } = parseInviteCode(inviteCode);
        if (!roomId) {
          setError('无效的邀请码');
          return false;
        }
        return true;
      } catch (err) {
        setError('无效的邀请码');
        return false;
      }
    } else if (roomId) {
      // 验证房间ID
      if (roomId.length < 4) {
        setError('房间ID至少需要4个字符');
        return false;
      }
      return true;
    } else {
      setError('请输入邀请码或房间ID');
      return false;
    }
  };
  
  // 处理提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loading) return;
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      let finalRoomId = roomId;
      
      // 如果使用邀请码，解析出房间ID
      if (inviteCode) {
        const { roomId: parsedRoomId } = parseInviteCode(inviteCode);
        finalRoomId = parsedRoomId;
      }
      
      // 调用加入函数或导航到房间页面
      if (onJoin) {
        await onJoin(finalRoomId);
      } else {
        navigate(`/room/${finalRoomId}`);
      }
    } catch (err) {
      console.error('加入房间失败:', err);
      setError(err.message || '加入房间失败，请检查房间ID是否正确');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理创建新房间
  const handleCreateRoom = () => {
    navigate('/create');
  };
  
  return (
    <form onSubmit={handleSubmit} className={`${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">加入房间</h2>
        <p className="text-gray-600">
          输入邀请码或房间ID加入已有房间
        </p>
      </div>
      
      {/* 邀请码输入 */}
      <Input
        label="邀请码"
        name="inviteCode"
        value={inviteCode}
        onChange={(e) => {
          setInviteCode(e.target.value);
          setRoomId(''); // 清空房间ID
        }}
        placeholder="粘贴邀请码..."
        error={error}
        fullWidth
        className="mb-4"
      />
      
      <div className="flex items-center my-4">
        <div className="flex-grow border-t border-gray-300"></div>
        <div className="px-3 text-gray-500 text-sm">或</div>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>
      
      {/* 房间ID输入 */}
      <Input
        label="房间ID"
        name="roomId"
        value={roomId}
        onChange={(e) => {
          setRoomId(e.target.value);
          setInviteCode(''); // 清空邀请码
        }}
        placeholder="输入房间ID..."
        error={error && !inviteCode ? error : ''}
        fullWidth
        className="mb-6"
      />
      
      <div className="flex flex-col space-y-3">
        <Button
          type="submit"
          disabled={loading}
          fullWidth
        >
          {loading ? '加入中...' : '加入房间'}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={handleCreateRoom}
          disabled={loading}
          fullWidth
        >
          创建新房间
        </Button>
      </div>
    </form>
  );
};

export default JoinRoomForm; 