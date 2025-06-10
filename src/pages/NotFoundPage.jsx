import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import Button from '@/components/Button';

// 404页面组件
const NotFoundPage = () => {
  return (
    <Layout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-6xl font-bold text-primary-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">页面不存在</h2>
        <p className="text-gray-600 mb-8 text-center max-w-md">
          您访问的页面不存在或已被移动，请返回首页继续使用海龟汤。
        </p>
        
        <Link to="/">
          <Button>返回首页</Button>
        </Link>
      </div>
    </Layout>
  );
};

export default NotFoundPage; 