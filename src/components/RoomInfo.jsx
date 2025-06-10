import React, { useState } from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { generateInviteCode, copyToClipboard } from '@/utils/helpers';
import Button from './Button';

// 房间信息组件
const RoomInfo = ({ className = '' }) => {
  const { currentRoom, isHost, updateRoom, endRoom } = useRoom();
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!currentRoom) return null;

  // 复制邀请码
  const handleCopyInvite = async () => {
    const inviteCode = generateInviteCode(currentRoom.roomId, currentRoom.title);
    const inviteLink = `${window.location.origin}/join/${inviteCode}`;
    
    const success = await copyToClipboard(inviteLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 更新房间状态
  const handleUpdateStatus = async (status) => {
    try {
      await updateRoom(status);
    } catch (error) {
      console.error('更新房间状态失败:', error);
    }
  };

  // 结束房间
  const handleEndRoom = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      await endRoom();
      setShowConfirm(false);
    } catch (error) {
      console.error('结束房间失败:', error);
    }
  };

  // 根据房间状态显示不同的按钮
  const renderStatusButton = () => {
    if (!isHost) return null;

    switch (currentRoom.status) {
      case 'waiting':
        return (
          <Button 
            onClick={() => handleUpdateStatus('active')}
            size="sm"
            variant="primary"
          >
            开始谜题
          </Button>
        );
      case 'active':
        return (
          <Button 
            onClick={() => handleUpdateStatus('solved')}
            size="sm"
            variant="secondary"
          >
            标记为已解决
          </Button>
        );
      case 'solved':
        return (
          <Button 
            onClick={handleEndRoom}
            size="sm"
            variant={showConfirm ? 'danger' : 'secondary'}
          >
            {showConfirm ? '确认结束房间?' : '结束房间'}
          </Button>
        );
      default:
        return null;
    }
  };

  // 房间状态文本
  const statusText = {
    waiting: '等待开始',
    active: '进行中',
    solved: '已解决',
    ended: '已结束',
  }[currentRoom.status] || '未知状态';

  // 房间状态样式
  const statusStyle = {
    waiting: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    solved: 'bg-yellow-100 text-yellow-800',
    ended: 'bg-gray-100 text-gray-800',
  }[currentRoom.status] || 'bg-gray-100 text-gray-800';

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-xl font-bold text-gray-800 break-words">{currentRoom.title}</h2>
        <span className={`px-2 py-1 rounded-full text-xs ${statusStyle}`}>{statusText}</span>
      </div>
      
      <div className="text-gray-600 mb-4">
        <p className="mb-1">房间ID: <span className="font-mono">{currentRoom.roomId}</span></p>
        {currentRoom.description && (
          <p className="text-sm whitespace-pre-wrap break-words">{currentRoom.description}</p>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleCopyInvite}
          size="sm"
          variant="outline"
          className="flex-grow"
        >
          {copied ? '已复制!' : '复制邀请链接'}
        </Button>
        
        {renderStatusButton()}
      </div>
    </div>
  );
};

export default RoomInfo; 