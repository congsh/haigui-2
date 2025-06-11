import React, { useState, useEffect } from 'react';
import {
  startCleanupSchedule,
  stopCleanupSchedule,
  getCleanupScheduleStatus,
  runCleanupTask,
  findExpiredRooms,
  findExpiredUsers
} from '../utils/leancloud';

const CleanupManager = () => {
  const [status, setStatus] = useState({ isRunning: false });
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [expiredStats, setExpiredStats] = useState({ rooms: 0, users: 0 });
  const [intervalHours, setIntervalHours] = useState(24);

  // 更新状态
  const updateStatus = () => {
    const currentStatus = getCleanupScheduleStatus();
    setStatus(currentStatus);
  };

  // 获取过期数据统计
  const updateExpiredStats = async () => {
    try {
      const [expiredRooms, expiredUsers] = await Promise.allSettled([
        findExpiredRooms(),
        findExpiredUsers()
      ]);
      
      setExpiredStats({
        rooms: expiredRooms.status === 'fulfilled' ? expiredRooms.value.length : 0,
        users: expiredUsers.status === 'fulfilled' ? expiredUsers.value.length : 0
      });
    } catch (error) {
      console.error('获取过期数据统计失败:', error);
    }
  };

  // 启动定时任务
  const handleStart = async () => {
    setLoading(true);
    try {
      const success = startCleanupSchedule(intervalHours);
      if (success) {
        updateStatus();
        await updateExpiredStats();
      }
    } catch (error) {
      console.error('启动定时任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 停止定时任务
  const handleStop = () => {
    setLoading(true);
    try {
      const success = stopCleanupSchedule();
      if (success) {
        updateStatus();
      }
    } catch (error) {
      console.error('停止定时任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 手动执行清理
  const handleManualCleanup = async () => {
    setLoading(true);
    try {
      const result = await runCleanupTask();
      setLastResult(result);
      await updateExpiredStats();
    } catch (error) {
      console.error('手动清理失败:', error);
      setLastResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时更新状态
  useEffect(() => {
    updateStatus();
    updateExpiredStats();
  }, []);

  // 定期更新状态
  useEffect(() => {
    const interval = setInterval(() => {
      updateStatus();
      updateExpiredStats();
    }, 30000); // 每30秒更新一次

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cleanup-manager">
      <div className="cleanup-header">
        <h3>🧹 数据清理管理</h3>
        <p className="cleanup-description">
          自动清理48小时未使用的房间和用户数据
        </p>
      </div>

      <div className="cleanup-stats">
        <div className="stat-item">
          <span className="stat-label">过期房间:</span>
          <span className="stat-value">{expiredStats.rooms}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">过期用户:</span>
          <span className="stat-value">{expiredStats.users}</span>
        </div>
      </div>

      <div className="cleanup-controls">
        <div className="interval-setting">
          <label htmlFor="interval">清理间隔（小时）:</label>
          <input
            id="interval"
            type="number"
            min="1"
            max="168"
            value={intervalHours}
            onChange={(e) => setIntervalHours(Number(e.target.value))}
            disabled={status.isRunning || loading}
          />
        </div>

        <div className="control-buttons">
          {!status.isRunning ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '启动中...' : '启动定时清理'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading}
              className="btn btn-secondary"
            >
              {loading ? '停止中...' : '停止定时清理'}
            </button>
          )}

          <button
            onClick={handleManualCleanup}
            disabled={loading}
            className="btn btn-outline"
          >
            {loading ? '清理中...' : '立即清理'}
          </button>
        </div>
      </div>

      <div className="cleanup-status">
        <div className="status-item">
          <span className="status-label">任务状态:</span>
          <span className={`status-value ${status.isRunning ? 'running' : 'stopped'}`}>
            {status.isRunning ? '运行中' : '已停止'}
          </span>
        </div>
        {status.timestamp && (
          <div className="status-item">
            <span className="status-label">更新时间:</span>
            <span className="status-value">
              {new Date(status.timestamp).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {lastResult && (
        <div className="cleanup-result">
          <h4>最近清理结果</h4>
          {lastResult.error ? (
            <div className="result-error">
              <p>❌ 清理失败: {lastResult.error}</p>
            </div>
          ) : (
            <div className="result-success">
              <p>✅ 清理完成 (耗时: {lastResult.duration})</p>
              {lastResult.rooms && (
                <div className="result-detail">
                  <span>房间: {lastResult.rooms.success}/{lastResult.rooms.total}</span>
                  {lastResult.rooms.failed > 0 && (
                    <span className="failed"> (失败: {lastResult.rooms.failed})</span>
                  )}
                </div>
              )}
              {lastResult.users && (
                <div className="result-detail">
                  <span>用户: {lastResult.users.success}/{lastResult.users.total}</span>
                  {lastResult.users.failed > 0 && (
                    <span className="failed"> (失败: {lastResult.users.failed})</span>
                  )}
                </div>
              )}
              <div className="result-timestamp">
                {new Date(lastResult.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .cleanup-manager {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .cleanup-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .cleanup-header h3 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 1.5rem;
        }

        .cleanup-description {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .cleanup-stats {
          display: flex;
          justify-content: space-around;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 4px;
        }

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: bold;
          color: #e74c3c;
        }

        .cleanup-controls {
          margin-bottom: 20px;
        }

        .interval-setting {
          margin-bottom: 15px;
        }

        .interval-setting label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #333;
        }

        .interval-setting input {
          width: 100px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }

        .control-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          min-width: 140px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #27ae60;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #219a52;
        }

        .btn-secondary {
          background: #e74c3c;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #c0392b;
        }

        .btn-outline {
          background: white;
          color: #3498db;
          border: 1px solid #3498db;
        }

        .btn-outline:hover:not(:disabled) {
          background: #3498db;
          color: white;
        }

        .cleanup-status {
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .status-item:last-child {
          margin-bottom: 0;
        }

        .status-label {
          font-weight: 500;
          color: #333;
        }

        .status-value {
          color: #666;
        }

        .status-value.running {
          color: #27ae60;
          font-weight: 500;
        }

        .status-value.stopped {
          color: #e74c3c;
          font-weight: 500;
        }

        .cleanup-result {
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .cleanup-result h4 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 1.1rem;
        }

        .result-success {
          color: #27ae60;
        }

        .result-error {
          color: #e74c3c;
        }

        .result-detail {
          margin: 5px 0;
          font-size: 0.9rem;
        }

        .result-detail .failed {
          color: #e74c3c;
        }

        .result-timestamp {
          margin-top: 10px;
          font-size: 0.8rem;
          color: #666;
        }

        @media (max-width: 600px) {
          .cleanup-manager {
            margin: 10px;
            padding: 15px;
          }

          .cleanup-stats {
            flex-direction: column;
            gap: 10px;
          }

          .control-buttons {
            flex-direction: column;
          }

          .btn {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default CleanupManager;