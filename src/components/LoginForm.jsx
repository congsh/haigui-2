import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Input from './Input';
import Button from './Button';
import { getFromLocalStorage } from '@/utils/helpers';

// 登录表单组件
const LoginForm = ({ 
  onLoginSuccess,
  className = '',
}) => {
  const { login, loading, error } = useAuth();
  const [nickname, setNickname] = useState('');
  const [formError, setFormError] = useState('');
  
  // 初始化时获取保存的昵称
  useEffect(() => {
    const savedNickname = getFromLocalStorage('userNickname');
    if (savedNickname) {
      setNickname(savedNickname);
    }
  }, []);
  
  // 验证表单
  const validateForm = () => {
    if (!nickname.trim()) {
      setFormError('请输入昵称');
      return false;
    }
    
    if (nickname.length > 20) {
      setFormError('昵称不能超过20个字符');
      return false;
    }
    
    setFormError('');
    return true;
  };
  
  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm() || loading) return;
    
    try {
      // 执行登录
      const user = await login(nickname);
      
      // 如果有回调，执行回调
      if (onLoginSuccess && user) {
        onLoginSuccess(user);
      }
    } catch (err) {
      console.error('登录失败:', err);
      setFormError(err.message || '登录失败，请重试');
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className={`${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">欢迎来到海龟汤</h2>
        <p className="text-gray-600">
          输入昵称，开始解谜之旅
        </p>
      </div>
      
      <Input
        label="昵称"
        name="nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="输入您的昵称..."
        error={formError || error}
        required
        fullWidth
        autoFocus
      />
      
      <div className="mt-6">
        <Button
          type="submit"
          disabled={loading}
          fullWidth
        >
          {loading ? '登录中...' : '进入'}
        </Button>
      </div>
      
      <p className="mt-4 text-sm text-gray-500 text-center">
        匿名登录，无需密码，仅用于区分用户
      </p>
    </form>
  );
};

export default LoginForm; 