import { createContext, useContext, useState, useEffect } from 'react';
import { loginAnonymously, getCurrentUser, logout } from '@/utils/leancloud';
import { getFromLocalStorage, saveToLocalStorage, removeFromLocalStorage } from '@/utils/helpers';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 初始化时检查是否已有登录用户
  useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error('检查当前用户失败:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkCurrentUser();
  }, []);

  // 登录函数
  const login = async (nickname) => {
    try {
      setLoading(true);
      setError(null);
      
      // 使用存储的昵称或提供的昵称
      const savedNickname = getFromLocalStorage('userNickname');
      const finalNickname = nickname || savedNickname || null;
      
      // 匿名登录
      const newUser = await loginAnonymously(finalNickname);
      
      // 保存昵称到 localStorage
      if (finalNickname) {
        saveToLocalStorage('userNickname', finalNickname);
      }
      
      setUser(newUser);
      return newUser;
    } catch (err) {
      console.error('登录失败:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logoutUser = async () => {
    try {
      setLoading(true);
      await logout();
      setUser(null);
      // 保留昵称，但清除其他可能的会话数据
      removeFromLocalStorage('currentRoom');
    } catch (err) {
      console.error('登出失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout: logoutUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
};

export default AuthContext; 