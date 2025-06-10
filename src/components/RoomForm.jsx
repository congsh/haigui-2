import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import useImageUpload from '@/hooks/useImageUpload';

// 房间创建表单组件
const RoomForm = ({
  onSubmit,
  loading = false,
  className = '',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});
  
  const { upload, preview, remove, uploading, progress } = useImageUpload();
  
  // 选择图片
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const previewUrl = await preview(file);
      setImageUrl(previewUrl);
    }
  };
  
  // 删除图片
  const handleRemoveImage = async () => {
    if (imageUrl && !imageUrl.startsWith('data:')) {
      await remove(imageUrl);
    }
    setImageUrl('');
    setImageFile(null);
  };
  
  // 验证表单
  const validateForm = () => {
    const newErrors = {};
    
    if (!title.trim()) {
      newErrors.title = '标题不能为空';
    } else if (title.length > 50) {
      newErrors.title = '标题不能超过50个字符';
    }
    
    if (description.length > 500) {
      newErrors.description = '描述不能超过500个字符';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm() || loading || uploading) return;
    
    // 如果有选择图片但尚未上传，先上传图片
    let finalImageUrl = imageUrl;
    if (imageFile && (!imageUrl || imageUrl.startsWith('data:'))) {
      finalImageUrl = await upload(imageFile);
      if (!finalImageUrl) return; // 上传失败
    }
    
    // 提交房间数据
    onSubmit({
      title,
      description,
      imageUrl: finalImageUrl,
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className={`${className}`}>
      {/* 标题 */}
      <Input
        label="标题"
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="输入谜题标题..."
        error={errors.title}
        required
        fullWidth
      />
      
      {/* 描述 */}
      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          描述 <span className="text-xs text-gray-500">(可选)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="输入谜题描述..."
          rows={4}
          className={`
            input w-full
            ${errors.description ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          `}
        />
        {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
        <p className="mt-1 text-xs text-gray-500">
          {description.length}/500 字符
        </p>
      </div>
      
      {/* 图片上传 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          封面图片 <span className="text-xs text-gray-500">(可选)</span>
        </label>
        
        {!imageUrl ? (
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="image-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                >
                  <span>上传图片</span>
                  <input
                    id="image-upload"
                    name="image-upload"
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={uploading || loading}
                  />
                </label>
                <p className="pl-1">或拖放图片到此处</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF 最大 2MB</p>
            </div>
          </div>
        ) : (
          <div className="mt-1 relative">
            <img
              src={imageUrl}
              alt="封面预览"
              className="h-40 w-full object-cover rounded-md"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              disabled={uploading || loading}
            >
              ×
            </button>
          </div>
        )}
        
        {/* 上传进度 */}
        {uploading && (
          <div className="mt-2">
            <div className="h-2 bg-gray-200 rounded">
              <div
                className="h-full bg-primary-500 rounded"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">上传中...{progress}%</p>
          </div>
        )}
      </div>
      
      {/* 提交按钮 */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading || uploading}
          fullWidth
        >
          {loading ? '创建中...' : '创建房间'}
        </Button>
      </div>
    </form>
  );
};

export default RoomForm; 