import { startCleanupSchedule, getCleanupScheduleStatus } from './leancloud';

/**
 * 初始化清理任务
 * 在应用启动时自动启动定时清理任务
 */
export const initializeCleanup = () => {
  try {
    // 检查是否已有运行中的任务
    const status = getCleanupScheduleStatus();
    
    if (!status.isRunning) {
      // 启动定时清理任务，默认24小时间隔
      const success = startCleanupSchedule(24);
      
      if (success) {
        console.log('✅ 定时清理任务已自动启动');
      } else {
        console.warn('⚠️ 定时清理任务启动失败');
      }
    } else {
      console.log('ℹ️ 定时清理任务已在运行中');
    }
  } catch (error) {
    console.error('❌ 初始化清理任务失败:', error);
  }
};

/**
 * 在页面卸载时清理定时任务
 */
export const cleanupOnUnload = () => {
  // 注册页面卸载事件
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      try {
        // 这里不需要停止定时任务，因为我们希望它在后台继续运行
        // 只是清理一些可能的内存泄漏
        console.log('页面卸载，清理任务继续运行');
      } catch (error) {
        console.error('页面卸载清理失败:', error);
      }
    });
  }
};

/**
 * 检查并报告清理任务状态
 */
export const reportCleanupStatus = () => {
  try {
    const status = getCleanupScheduleStatus();
    console.log('🔍 清理任务状态:', {
      运行状态: status.isRunning ? '运行中' : '已停止',
      检查时间: status.timestamp
    });
    return status;
  } catch (error) {
    console.error('获取清理任务状态失败:', error);
    return null;
  }
};

// 导出默认初始化函数
export default initializeCleanup;