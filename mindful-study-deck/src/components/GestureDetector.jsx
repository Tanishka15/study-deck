import React, { useEffect } from 'react';
import { useGestures } from '../hooks/useGestures';

export default function GestureDetector({ videoElement, onGesture, enabled = true }) {
  const { currentGesture, isReady, clearGesture } = useGestures(enabled ? videoElement : null);

  useEffect(() => {
    if (currentGesture && onGesture) {
      onGesture(currentGesture);
      // Auto-clear gesture after handling
      setTimeout(clearGesture, 500);
    }
  }, [currentGesture, onGesture, clearGesture]);

  if (!enabled) return null;

  return (
    <div className="fixed top-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
        <span className="text-xs font-semibold text-gray-700">Gesture Detection</span>
      </div>
      
      {currentGesture ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {currentGesture.type === 'swipe' && currentGesture.direction === 'left' && '👈'}
              {currentGesture.type === 'swipe' && currentGesture.direction === 'right' && '👉'}
              {currentGesture.type === 'thumbs_up' && '👍'}
              {currentGesture.type === 'thumbs_down' && '👎'}
              {currentGesture.type === 'pinch' && '🤏'}
              {currentGesture.type === 'point' && '☝️'}
              {currentGesture.type === 'open_palm' && '✋'}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {currentGesture.type === 'swipe' && `Swipe ${currentGesture.direction}`}
                {currentGesture.type === 'thumbs_up' && 'Thumbs Up'}
                {currentGesture.type === 'thumbs_down' && 'Thumbs Down'}
                {currentGesture.type === 'pinch' && 'Pinch (Erase)'}
                {currentGesture.type === 'point' && 'Point (Draw)'}
                {currentGesture.type === 'open_palm' && 'Open Palm'}
              </p>
              <p className="text-xs text-gray-600">
                {Math.round(currentGesture.confidence * 100)}% confident
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">No gesture detected</p>
      )}

      {/* Quick guide */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-1">Quick Guide:</p>
        <div className="space-y-0.5 text-xs text-gray-600">
          <div>👈/👉 Swipe to navigate</div>
          <div>👍/👎 Mark card</div>
          <div>☝️ Point to draw</div>
          <div>🤏 Pinch to erase</div>
        </div>
      </div>
    </div>
  );
}
