import React, { useState } from 'react';
import Button from './Button';
import useImageUpload from '@/hooks/useImageUpload';

// 消息输入组件，用于发送消息和图片
const MessageInput = ({
  onSendMessage,
  messageType = 'question',
  placeholder = '输入消息...',
  disabled = false,
  showImageUpload = true,
}) => {
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const { upload, preview, uploading, progress, error } = useImageUpload();
  
  // 选择图片
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const previewUrl = await preview(file);
      setImagePreview(previewUrl);
    }
  };
  
  // 取消图片
  const handleCancelImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };
  
  // 发送消息
  const handleSendMessage = async () => {
    if ((!message.trim() && !imageFile) || disabled) return;
    
    let imageUrl = null;
    
    // 如果有图片，先上传
    if (imageFile) {
      imageUrl = await upload(imageFile);
      if (!imageUrl) return; // 上传失败
    }
    
    // 发送消息
    await onSendMessage(message, messageType, imageUrl);
    
    // 清空输入
    setMessage('');
    setImageFile(null);
    setImagePreview(null);
  };
  
  // 按回车发送
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="border-t border-gray-200 pt-3">
      {/* 图片预览 */}
      {imagePreview && (
        <div className="mb-2 relative">
          <img 
            src={imagePreview} 
            alt="预览" 
            className="h-20 rounded-md object-contain bg-gray-100" 
          />
          <button 
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
            onClick={handleCancelImage}
          >
            ×
          </button>
        </div>
      )}
      
      {/* 上传进度 */}
      {uploading && (
        <div className="mb-2">
          <div className="h-2 bg-gray-200 rounded">
            <div 
              className="h-full bg-primary-500 rounded" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">上传中...{progress}%</p>
        </div>
      )}
      
      {/* 错误信息 */}
      {error && (
        <p className="text-red-500 text-sm mb-2">{error}</p>
      )}
      
      <div className="flex items-end space-x-2">
        {/* 图片上传按钮 */}
        {showImageUpload && (
          <div>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={disabled || uploading}
            />
            <label 
              htmlFor="image-upload" 
              className={`
                flex items-center justify-center w-10 h-10 rounded-full 
                ${disabled || uploading ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 cursor-pointer'}
              `}
            >
              📷
            </label>
          </div>
        )}
        
        {/* 消息输入框 */}
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || uploading}
            className="input w-full resize-none"
            rows={1}
          />
        </div>
        
        {/* 发送按钮 */}
        <Button
          onClick={handleSendMessage}
          disabled={(!message.trim() && !imageFile) || disabled || uploading}
          size="sm"
        >
          发送
        </Button>
      </div>
    </div>
  );
};

export default MessageInput; 