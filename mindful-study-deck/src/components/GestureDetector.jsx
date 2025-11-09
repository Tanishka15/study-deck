import React, { useEffect } from 'react';
import { useGestures } from '../hooks/useGestures';

export default function GestureDetector({ videoElement, onGesture, enabled = true }) {
  const { currentGesture, isReady, isHandDetected } = useGestures(enabled ? videoElement : null);

  useEffect(() => {
    if (currentGesture && onGesture) {
      onGesture(currentGesture);
    }
  }, [currentGesture, onGesture]);

  if (!enabled) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-800">👋 Gesture Control</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
          <span className={`text-xs px-2 py-1 rounded ${isHandDetected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {isHandDetected ? 'Hand Detected' : 'No Hand'}
          </span>
        </div>
      </div>
      
      {currentGesture && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs font-medium text-blue-800">
            Current: {currentGesture.type}
            {currentGesture.direction && ` (${currentGesture.direction})`}
          </p>
        </div>
      )}

      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">👈 Swipe Left:</span>
          <span>Next card</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">👉 Swipe Right:</span>
          <span>Previous card</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">👍 Thumbs Up:</span>
          <span>Mark understood</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">👎 Thumbs Down:</span>
          <span>Mark for review</span>
        </div>
      </div>

      {!isReady && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          Loading gesture detection...
        </div>
      )}
    </div>
  );
}