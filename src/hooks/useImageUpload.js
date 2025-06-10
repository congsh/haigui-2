import { useState, useCallback } from 'react';
import { uploadImage, deleteImage } from '@/utils/leancloud';
import { compressImage, fileToBase64 } from '@/utils/helpers';

// 自定义Hook，用于处理图片上传
const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // 上传图片函数
  const upload = useCallback(async (file) => {
    if (!file) {
      setError('没有选择文件');
      return null;
    }
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return null;
    }
    
    // 检查文件大小（限制为2MB）
    if (file.size > 2 * 1024 * 1024) {
      setError('图片大小不能超过2MB');
      return null;
    }
    
    try {
      setUploading(true);
      setProgress(10);
      setError(null);
      
      // 压缩图片
      const compressedFile = await compressImage(file);
      setProgress(30);
      
      // 创建唯一文件名
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileName = `haigui_${timestamp}_${randomString}.${file.name.split('.').pop()}`;
      
      setProgress(50);
      
      // 上传到LeanCloud
      const fileUrl = await uploadImage(compressedFile, fileName);
      setProgress(100);
      
      return fileUrl;
    } catch (err) {
      console.error('上传图片失败:', err);
      setError(err.message);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);
  
  // 预览图片函数
  const preview = useCallback(async (file) => {
    if (!file) return null;
    
    try {
      const base64 = await fileToBase64(file);
      return base64;
    } catch (err) {
      console.error('生成预览失败:', err);
      setError(err.message);
      return null;
    }
  }, []);
  
  // 删除图片函数
  const remove = useCallback(async (url) => {
    if (!url) return false;
    
    try {
      setUploading(true);
      const result = await deleteImage(url);
      return result;
    } catch (err) {
      console.error('删除图片失败:', err);
      setError(err.message);
      return false;
    } finally {
      setUploading(false);
    }
  }, []);
  
  return {
    upload,
    preview,
    remove,
    uploading,
    progress,
    error,
  };
};

export default useImageUpload; 