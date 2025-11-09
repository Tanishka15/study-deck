import React, { useState } from 'react';

/**
 * GestureDiagnostics Component
 * Displays real-time hand gesture detection diagnostics in a draggable panel
 */
export default function GestureDiagnostics({ landmarks, gesture, isHandDetected, fingerPosition }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLocked, setIsLocked] = useState(false);

  const handleMouseDown = (e) => {
    if (isLocked) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isLocked) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, isLocked]);

  return (
    <div
      className="fixed z-50 bg-white rounded-xl shadow-2xl border-2 border-indigo-500"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '320px',
        maxHeight: isMinimized ? '48px' : '400px',
        transition: isDragging ? 'none' : 'max-height 0.3s ease'
      }}
    >
      {/* Header - Draggable */}
      <div
        className={`flex items-center justify-between p-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-t-xl ${
          !isLocked ? 'cursor-move' : 'cursor-default'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">👋</span>
          <h3 className="font-bold text-sm">Gesture Diagnostics</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLocked(!isLocked);
            }}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title={isLocked ? 'Unlock position' : 'Lock position'}
          >
            {isLocked ? '🔒' : '🔓'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            {isMinimized ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: '352px' }}>
          {/* Hand Detection Status */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm font-medium text-gray-700">Hand Detected:</span>
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              isHandDetected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isHandDetected ? 'YES ✓' : 'NO ✗'}
            </span>
          </div>

          {/* Current Gesture */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded border border-blue-200">
            <div className="text-xs font-medium text-gray-600 mb-1">Current Gesture:</div>
            <div className="text-lg font-bold text-indigo-700">
              {gesture || 'None'}
            </div>
          </div>

          {/* Landmark Count */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm font-medium text-gray-700">Landmarks:</span>
            <span className="text-sm font-bold text-gray-900">
              {landmarks?.length || 0} points
            </span>
          </div>

          {/* Finger Position */}
          {fingerPosition && (
            <div className="p-2 bg-purple-50 rounded border border-purple-200">
              <div className="text-xs font-medium text-gray-600 mb-2">Finger Tip Position:</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">X:</span>
                  <span className="ml-1 font-mono font-bold">{fingerPosition[0]?.toFixed(2) || '0.00'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Y:</span>
                  <span className="ml-1 font-mono font-bold">{fingerPosition[1]?.toFixed(2) || '0.00'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Z:</span>
                  <span className="ml-1 font-mono font-bold">{fingerPosition[2]?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Gesture Guide */}
          <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
            <div className="text-xs font-semibold text-yellow-800 mb-2">📖 Gesture Guide:</div>
            <div className="text-xs text-gray-700 space-y-1">
              <div>👈 <strong>Swipe Left:</strong> Next card</div>
              <div>👉 <strong>Swipe Right:</strong> Previous card</div>
              <div>👍 <strong>Thumbs Up:</strong> Mark understood</div>
              <div>👎 <strong>Thumbs Down:</strong> Mark for review</div>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              isHandDetected ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <span>{isHandDetected ? 'Tracking active' : 'Waiting for hand...'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
