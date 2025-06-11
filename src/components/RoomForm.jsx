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
  // 汤面相关状态
  const [title, setTitle] = useState(''); // 汤面文字
  const [titleImageUrl, setTitleImageUrl] = useState(''); // 汤面图片
  const [titleImageFile, setTitleImageFile] = useState(null);
  const [titleIsImage, setTitleIsImage] = useState(false); // 汤面是否为图片
  
  // 汤底相关状态
  const [solution, setSolution] = useState(''); // 汤底文字
  const [solutionImageUrl, setSolutionImageUrl] = useState(''); // 汤底图片
  const [solutionImageFile, setSolutionImageFile] = useState(null);
  const [solutionIsImage, setSolutionIsImage] = useState(false); // 汤底是否为图片
  
  // 游戏规则状态
  const [freeQuestion, setFreeQuestion] = useState(true); // 自由提问模式
  const [allowFlowers, setAllowFlowers] = useState(true); // 允许互动
  
  const [errors, setErrors] = useState({});
  
  const { upload, preview, remove, uploading, progress } = useImageUpload();
  
  // 选择汤面图片
  const handleTitleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setTitleImageFile(file);
      const previewUrl = await preview(file);
      setTitleImageUrl(previewUrl);
    }
  };
  
  // 删除汤面图片
  const handleRemoveTitleImage = async () => {
    if (titleImageUrl && !titleImageUrl.startsWith('data:')) {
      await remove(titleImageUrl);
    }
    setTitleImageUrl('');
    setTitleImageFile(null);
    setTitleIsImage(false);
  };
  
  // 选择汤底图片
  const handleSolutionImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSolutionImageFile(file);
      const previewUrl = await preview(file);
      setSolutionImageUrl(previewUrl);
    }
  };
  
  // 删除汤底图片
  const handleRemoveSolutionImage = async () => {
    if (solutionImageUrl && !solutionImageUrl.startsWith('data:')) {
      await remove(solutionImageUrl);
    }
    setSolutionImageUrl('');
    setSolutionImageFile(null);
    setSolutionIsImage(false);
  };
  
  // 验证表单
  const validateForm = () => {
    const newErrors = {};
    
    // 验证汤面
    if (titleIsImage) {
      if (!titleImageUrl && !titleImageFile) {
        newErrors.title = '请选择汤面图片';
      }
    } else {
      if (!title.trim()) {
        newErrors.title = '汤面内容不能为空';
      } else if (title.length > 200) {
        newErrors.title = '汤面内容不能超过200个字符';
      }
    }
    
    // 验证汤底
    if (solutionIsImage) {
      if (!solutionImageUrl && !solutionImageFile) {
        newErrors.solution = '请选择汤底图片';
      }
    } else {
      if (!solution.trim()) {
        newErrors.solution = '汤底内容不能为空';
      } else if (solution.length > 500) {
        newErrors.solution = '汤底内容不能超过500个字符';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm() || loading || uploading) return;
    
    // 上传汤面图片（如果需要）
    let finalTitleImageUrl = titleImageUrl;
    if (titleIsImage && titleImageFile && (!titleImageUrl || titleImageUrl.startsWith('data:'))) {
      finalTitleImageUrl = await upload(titleImageFile);
      if (!finalTitleImageUrl) return; // 上传失败
    }
    
    // 上传汤底图片（如果需要）
    let finalSolutionImageUrl = solutionImageUrl;
    if (solutionIsImage && solutionImageFile && (!solutionImageUrl || solutionImageUrl.startsWith('data:'))) {
      finalSolutionImageUrl = await upload(solutionImageFile);
      if (!finalSolutionImageUrl) return; // 上传失败
    }
    
    // 提交房间数据
    onSubmit({
      title: titleIsImage ? '' : title,
      titleIsImage,
      titleImage: titleIsImage ? finalTitleImageUrl : '',
      solution: solutionIsImage ? '' : solution,
      solutionIsImage,
      solutionImage: solutionIsImage ? finalSolutionImageUrl : '',
      rules: {
        freeQuestion,
        allowFlowers,
      },
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className={`${className}`}>
      {/* 汤面设置 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">汤面设置</h3>
        
        {/* 汤面类型选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            汤面类型
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="titleType"
                checked={!titleIsImage}
                onChange={() => setTitleIsImage(false)}
                className="mr-2"
              />
              文字汤面
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="titleType"
                checked={titleIsImage}
                onChange={() => setTitleIsImage(true)}
                className="mr-2"
              />
              图片汤面
            </label>
          </div>
        </div>
        
        {/* 汤面内容 */}
        {!titleIsImage ? (
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              汤面内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入汤面内容，例如：一个男人在餐厅里喝了一碗海龟汤后自杀了，为什么？"
              rows={3}
              className={`
                input w-full
                ${errors.title ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
              `}
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
            <p className="mt-1 text-xs text-gray-500">
              {title.length}/200 字符
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              汤面图片 <span className="text-red-500">*</span>
            </label>
            
            {!titleImageUrl ? (
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
                      htmlFor="title-image-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                    >
                      <span>上传汤面图片</span>
                      <input
                        id="title-image-upload"
                        name="title-image-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleTitleImageSelect}
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
                  src={titleImageUrl}
                  alt="汤面预览"
                  className="h-40 w-full object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={handleRemoveTitleImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  disabled={uploading || loading}
                >
                  ×
                </button>
              </div>
            )}
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>
        )}
      </div>
      
      {/* 汤底设置 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">汤底设置</h3>
        
        {/* 汤底类型选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            汤底类型
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="solutionType"
                checked={!solutionIsImage}
                onChange={() => setSolutionIsImage(false)}
                className="mr-2"
              />
              文字汤底
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="solutionType"
                checked={solutionIsImage}
                onChange={() => setSolutionIsImage(true)}
                className="mr-2"
              />
              图片汤底
            </label>
          </div>
        </div>
        
        {/* 汤底内容 */}
        {!solutionIsImage ? (
          <div className="mb-4">
            <label htmlFor="solution" className="block text-sm font-medium text-gray-700 mb-1">
              汤底内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="solution"
              name="solution"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="请输入汤底内容，即谜题的答案解释..."
              rows={4}
              className={`
                input w-full
                ${errors.solution ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
              `}
            />
            {errors.solution && <p className="mt-1 text-sm text-red-500">{errors.solution}</p>}
            <p className="mt-1 text-xs text-gray-500">
              {solution.length}/500 字符
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              汤底图片 <span className="text-red-500">*</span>
            </label>
            
            {!solutionImageUrl ? (
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
                      htmlFor="solution-image-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                    >
                      <span>上传汤底图片</span>
                      <input
                        id="solution-image-upload"
                        name="solution-image-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleSolutionImageSelect}
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
                  src={solutionImageUrl}
                  alt="汤底预览"
                  className="h-40 w-full object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={handleRemoveSolutionImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  disabled={uploading || loading}
                >
                  ×
                </button>
              </div>
            )}
            {errors.solution && <p className="mt-1 text-sm text-red-500">{errors.solution}</p>}
          </div>
        )}
      </div>
      
      {/* 游戏规则设置 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">游戏规则</h3>
        
        {/* 提问模式 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            提问模式
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="questionMode"
                checked={freeQuestion}
                onChange={() => setFreeQuestion(true)}
                className="mr-2"
              />
              <div>
                <span className="font-medium">自由模式</span>
                <p className="text-sm text-gray-500">参与者可以随时提问</p>
              </div>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="questionMode"
                checked={!freeQuestion}
                onChange={() => setFreeQuestion(false)}
                className="mr-2"
              />
              <div>
                <span className="font-medium">举手模式</span>
                <p className="text-sm text-gray-500">参与者需要举手申请，由主持人点名后才能提问</p>
              </div>
            </label>
          </div>
        </div>
        
        {/* 互动功能 */}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={allowFlowers}
              onChange={(e) => setAllowFlowers(e.target.checked)}
              className="mr-2"
            />
            <div>
              <span className="font-medium">允许互动功能</span>
              <p className="text-sm text-gray-500">参与者可以互相发送鲜花或垃圾表情</p>
            </div>
          </label>
        </div>
      </div>
      
      {/* 上传进度 */}
      {uploading && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-full bg-primary-500 rounded"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">上传中...{progress}%</p>
        </div>
      )}
      
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