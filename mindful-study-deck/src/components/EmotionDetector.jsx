import React from 'react';
import { useEmotions } from '../hooks/useEmotions';

export default function EmotionDetector({ videoElement, onEmotionChange, enabled = true }) {
  // Always pass 'simulated' if videoElement is null to force simulated detection
  const { currentEmotion, frustrationScore, isFrustrated, isReady } = useEmotions(
    enabled ? (videoElement || 'simulated') : null
  );

  const [lastUpdate, setLastUpdate] = React.useState(Date.now());

  React.useEffect(() => {
    if (onEmotionChange) {
      onEmotionChange(currentEmotion, isFrustrated);
    }
    setLastUpdate(Date.now());
  }, [currentEmotion, isFrustrated, onEmotionChange]);

  if (!enabled) return null;

  const getEmotionEmoji = () => {
    switch (currentEmotion) {
      case 'happy':
        return '😊';
      case 'angry':
        return '😤';
      case 'confused':
      case 'sad':
        return '😕';
      case 'surprised':
        return '😮';
      case 'fearful':
        return '😰';
      case 'disgusted':
        return '😖';
      default:
        return '😐';
    }
  };

  const getEmotionColor = () => {
    switch (currentEmotion) {
      case 'happy':
        return 'text-green-600';
      case 'angry':
      case 'disgusted':
        return 'text-red-600';
      case 'confused':
      case 'sad':
        return 'text-orange-600';
      case 'fearful':
        return 'text-purple-600';
      case 'surprised':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed top-24 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 min-w-[200px] border-2 border-indigo-100">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
        <span className="text-xs font-semibold text-gray-700">Emotion Detection</span>
        {isReady && <span className="text-xs text-green-600">●</span>}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl transition-transform duration-300 hover:scale-110" key={currentEmotion}>
            {getEmotionEmoji()}
          </span>
          <div>
            <p className={`text-sm font-medium ${getEmotionColor()} transition-colors duration-300`}>
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
                frustrationScore > 30
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
