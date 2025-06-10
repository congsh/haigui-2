import React from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { formatTime } from '@/utils/helpers';

// 参与者列表组件
const ParticipantList = ({ 
  className = '',
  maxHeight = '300px',
  showJoinTime = true,
}) => {
  const { participants, loading } = useRoom();

  // 对参与者进行排序（主持人优先，然后按加入时间排序）
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isHost !== b.isHost) {
      return a.isHost ? -1 : 1;
    }
    return new Date(a.joinedAt) - new Date(b.joinedAt);
  });

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <h3 className="text-lg font-medium text-gray-700 mb-3">参与者 ({participants.length})</h3>
      
      {loading ? (
        <div className="text-center text-gray-500 py-4">加载中...</div>
      ) : participants.length === 0 ? (
        <div className="text-center text-gray-500 py-4">暂无参与者</div>
      ) : (
        <ul 
          className="space-y-2 overflow-y-auto"
          style={{ maxHeight }}
        >
          {sortedParticipants.map((participant, index) => (
            <li 
              key={index} 
              className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center mr-3">
                  {participant.nickname.charAt(0)}
                </div>
                <div>
                  <span className="font-medium text-gray-800">
                    {participant.nickname}
                  </span>
                  {participant.isHost && (
                    <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                      主持人
                    </span>
                  )}
                  {showJoinTime && participant.joinedAt && (
                    <p className="text-xs text-gray-500">
                      加入于 {formatTime(participant.joinedAt)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ParticipantList; 