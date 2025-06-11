import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoom } from '@/contexts/RoomContext';
import Button from './Button';

// 布局组件，包含页头和页脚
const Layout = ({ children, showHeader = true, showFooter = true }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { currentRoom, leaveRoom } = useRoom();
  const navigate = useNavigate();

  // 处理登出
  const handleLogout = async () => {
    try {
      // 如果在房间中，先离开房间
      if (currentRoom) {
        await leaveRoom();
      }
      await logout();
      navigate('/');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  // 处理返回主页
  const handleBackToHome = async () => {
    try {
      // 如果在房间中，先离开房间
      if (currentRoom) {
        await leaveRoom();
      }
      navigate('/');
    } catch (error) {
      console.error('离开房间失败:', error);
      // 即使离开房间失败，也继续导航到主页
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 页头 */}
      {showHeader && (
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-primary-600">
                  海龟汤
                </Link>
                {currentRoom && (
                  <span className="ml-4 text-sm text-gray-500">
                    房间: {currentRoom.roomId}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <>
                    <span className="text-sm text-gray-600">
                      {user.get('nickname') || '匿名用户'}
                    </span>
                    {currentRoom ? (
                      <Button
                        onClick={handleBackToHome}
                        variant="outline"
                        size="sm"
                      >
                        退出房间
                      </Button>
                    ) : (
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        size="sm"
                      >
                        退出登录
                      </Button>
                    )}
                  </>
                ) : (
                  <Link to="/login">
                    <Button variant="primary" size="sm">
                      登录
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* 主内容 */}
      <main className="flex-grow">
        {children}
      </main>

      {/* 页脚 */}
      {showFooter && (
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-gray-500 text-sm">
              <p>海龟汤在线房间 &copy; {new Date().getFullYear()}</p>
              <p className="mt-1">基于LeanCloud实现的纯前端谜题游戏</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;