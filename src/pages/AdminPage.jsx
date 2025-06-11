import React from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import CleanupManager from '@/components/CleanupManager';
import { useAuth } from '@/contexts/AuthContext';

// 管理页面组件
const AdminPage = () => {
  const { isAuthenticated, user } = useAuth();
  
  // 如果未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // 简单的管理员检查（可以根据需要调整权限逻辑）
  const isAdmin = user && (user.nickname === 'admin' || user.email?.includes('admin'));
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🛠️ 系统管理
          </h1>
          <p className="text-lg text-gray-600">
            管理系统数据和定时任务
          </p>
        </div>
        
        {isAdmin ? (
          <div className="space-y-8">
            {/* 数据清理管理 */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <CleanupManager />
            </div>
            
            {/* 其他管理功能可以在这里添加 */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                📊 系统信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">当前用户</h4>
                  <p className="text-blue-700">{user?.nickname || '未知'}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">系统状态</h4>
                  <p className="text-green-700">正常运行</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">版本信息</h4>
                  <p className="text-purple-700">v1.0.0</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                ⚠️ 注意事项
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <ul className="space-y-2 text-yellow-800">
                  <li>• 定时清理任务会自动删除48小时未使用的房间和用户数据</li>
                  <li>• 清理操作不可逆，请谨慎使用手动清理功能</li>
                  <li>• 建议在低峰期执行大规模清理操作</li>
                  <li>• 清理过程中可能会影响系统性能</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              访问受限
            </h2>
            <p className="text-gray-600 mb-6">
              抱歉，您没有访问管理页面的权限。
            </p>
            <p className="text-sm text-gray-500">
              如需管理权限，请联系系统管理员。
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPage;