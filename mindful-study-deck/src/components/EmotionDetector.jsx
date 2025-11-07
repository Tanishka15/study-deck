import React from 'react';
import { useEmotions } from '../hooks/useEmotions';

export default function EmotionDetector({ videoElement, onEmotionChange, enabled = true }) {
  const { currentEmotion, frustrationScore, isFrustrated, isReady } = useEmotions(
    enabled ? videoElement : null
  );

  React.useEffect(() => {
    if (onEmotionChange) {
      onEmotionChange(currentEmotion, isFrustrated);
    }
  }, [currentEmotion, isFrustrated, onEmotionChange]);

  if (!enabled) return null;

  const getEmotionEmoji = () => {
    switch (currentEmotion) {
      case 'happy':
        return '😊';
      case 'angry':
        return '😤';
      default:
        return '😐';
    }
  };

  const getEmotionColor = () => {
    switch (currentEmotion) {
      case 'happy':
        return 'text-green-600';
      case 'angry':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed top-24 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
        <span className="text-xs font-semibold text-gray-700">Emotion Detection</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getEmotionEmoji()}</span>
          <div>
            <p className={`text-sm font-medium ${getEmotionColor()}`}>
              {currentEmotion.charAt(0).toUpperCase() + currentEmotion.slice(1)}
            </p>
            <p className="text-xs text-gray-600">Current mood</p>
          </div>
        </div>

        {/* Frustration meter */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Frustration</span>
            <span className="text-xs text-gray-600">{frustrationScore}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                frustrationScore > 50
                  ? 'bg-red-500'
                  : frustrationScore > 25
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${frustrationScore}%` }}
            ></div>
          </div>
        </div>

        {isFrustrated && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-center">
            <p className="text-xs text-yellow-800 font-medium">
              Taking it easy with simpler content
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
