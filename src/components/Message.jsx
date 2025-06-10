import React from 'react';
import { formatTime } from '@/utils/helpers';

// 消息类型图标
const MessageTypeIcon = ({ type }) => {
  switch (type) {
    case 'question':
      return <span className="text-blue-500">❓</span>;
    case 'answer':
      return <span className="text-green-500">✅</span>;
    case 'clue':
      return <span className="text-yellow-500">💡</span>;
    case 'interaction':
      return <span className="text-purple-500">🔄</span>;
    default:
      return null;
  }
};

// 消息组件，用于展示聊天消息
const Message = ({ 
  message, 
  isCurrentUser = false,
  isHost = false,
}) => {
  const { type, fromName, content, timestamp, imageUrl } = message;

  // 根据消息类型和发送者确定气泡样式
  const getBubbleStyle = () => {
    if (isCurrentUser) {
      return 'bg-primary-100 text-gray-800';
    } else if (isHost && type === 'answer') {
      return 'bg-green-100 text-gray-800';
    } else if (isHost && type === 'clue') {
      return 'bg-yellow-100 text-gray-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isCurrentUser ? 'order-1' : 'order-2'}`}>
        <div className="flex items-center mb-1">
          {!isCurrentUser && (
            <span className="text-sm font-medium text-gray-700 mr-2">
              {fromName} {isHost && <span className="text-xs text-primary-600">(主持人)</span>}
            </span>
          )}
          <MessageTypeIcon type={type} />
          <span className="text-xs text-gray-500 ml-2">
            {timestamp ? formatTime(timestamp) : ''}
          </span>
        </div>
        
        <div className={`rounded-lg px-4 py-2 ${getBubbleStyle()}`}>
          {imageUrl && (
            <div className="mb-2">
              <img 
                src={imageUrl} 
                alt="消息图片" 
                className="max-w-full rounded-md max-h-40 object-contain"
                onClick={() => window.open(imageUrl, '_blank')}
              />
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>
    </div>
  );
};

export default Message; 