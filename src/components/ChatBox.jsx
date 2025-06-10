import React, { useEffect, useRef } from 'react';
import Message from './Message';
import MessageInput from './MessageInput';
import { useAuth } from '@/contexts/AuthContext';
import { useRoom } from '@/contexts/RoomContext';

// 聊天盒子组件，包含消息列表和输入框
const ChatBox = ({ 
  showHost = true,
  maxHeight = '600px',
  showImageUpload = true,
  className = '',
}) => {
  const { user } = useAuth();
  const { messages, participants, sendMessage, loading, isHost } = useRoom();
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 查找主持人
  const host = participants.find(p => p.isHost);

  // 发送消息
  const handleSendMessage = async (content, type = 'question', imageUrl = null) => {
    if (!content.trim() && !imageUrl) return;
    
    // 根据用户角色决定消息类型
    const messageType = isHost && type !== 'question' ? type : 'question';
    
    await sendMessage(content, messageType, imageUrl);
  };

  // 发送线索（仅主持人）
  const handleSendClue = async (content, imageUrl = null) => {
    if (!isHost) return;
    await handleSendMessage(content, 'clue', imageUrl);
  };

  // 发送答案（仅主持人）
  const handleSendAnswer = async (content, imageUrl = null) => {
    if (!isHost) return;
    await handleSendMessage(content, 'answer', imageUrl);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 消息列表 */}
      <div 
        className="flex-1 overflow-y-auto p-4 bg-white rounded-t-lg shadow-sm"
        style={{ maxHeight }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {loading ? '加载消息中...' : '暂无消息，开始互动吧！'}
          </div>
        ) : (
          messages.map((message, index) => (
            <Message
              key={index}
              message={message}
              isCurrentUser={user && message.from === user.id}
              isHost={host && message.from === host.userId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 消息输入框 */}
      <div className="bg-white rounded-b-lg shadow-sm p-3">
        {/* 主持人特殊控制 */}
        {isHost && showHost && (
          <div className="flex space-x-2 mb-3">
            <button
              onClick={() => handleSendClue('', null)}
              className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md hover:bg-yellow-200"
            >
              发送线索
            </button>
            <button
              onClick={() => handleSendAnswer('', null)}
              className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-md hover:bg-green-200"
            >
              发送答案
            </button>
          </div>
        )}

        <MessageInput
          onSendMessage={handleSendMessage}
          messageType={isHost ? 'answer' : 'question'}
          placeholder={isHost ? '输入回答或线索...' : '输入你的问题...'}
          disabled={loading}
          showImageUpload={showImageUpload}
        />
      </div>
    </div>
  );
};

export default ChatBox; 