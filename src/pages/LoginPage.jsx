import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import LoginForm from '@/components/LoginForm';
import { useAuth } from '@/contexts/AuthContext';

// 登录页面组件
const LoginPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // 如果已登录，重定向到首页
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }
  
  // 登录成功后的回调
  const handleLoginSuccess = () => {
    navigate('/');
  };
  
  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8">
          <LoginForm 
            onLoginSuccess={handleLoginSuccess} 
            className="w-full"
          />
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage; 