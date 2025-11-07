import React from 'react';
import { useBlinks } from '../hooks/useBlinks';

export default function BlinkDetector({ videoElement, onFatigueDetected, enabled = true }) {
  const { blinkCount, blinkRate, isTired, shouldSuggestBreak, consecutiveTiredMinutes, isReady } = 
    useBlinks(enabled ? videoElement : null);

  React.useEffect(() => {
    if (shouldSuggestBreak && onFatigueDetected) {
      onFatigueDetected();
    }
  }, [shouldSuggestBreak, onFatigueDetected]);

  if (!enabled) return null;

  const getBlinkRateColor = () => {
    if (blinkRate > 24) return 'text-red-600';
    if (blinkRate > 20) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getBlinkRateLabel = () => {
    if (blinkRate > 24) return 'High (Tired)';
    if (blinkRate > 20) return 'Elevated';
    return 'Normal';
  };

  return (
    <div className="fixed top-44 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
        <span className="text-xs font-semibold text-gray-700">Blink Detection</span>
      </div>

      <div className="space-y-3">
        {/* Blink rate */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Blink Rate:</span>
          <div className="text-right">
            <p className={`text-sm font-bold ${getBlinkRateColor()}`}>
              {blinkRate}/min
            </p>
            <p className="text-xs text-gray-500">{getBlinkRateLabel()}</p>
          </div>
        </div>

        {/* Total blinks */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Total Blinks:</span>
          <span className="text-sm font-medium text-gray-900">{blinkCount}</span>
        </div>

        {/* Fatigue indicator */}
        {isTired && (
          <div className={`p-2 rounded text-center ${
            shouldSuggestBreak ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className="text-xs font-medium mb-1">
              {shouldSuggestBreak ? '😴 Take a break!' : '😪 Getting tired'}
            </p>
            {consecutiveTiredMinutes > 0 && (
              <p className="text-xs text-gray-600">
                {consecutiveTiredMinutes} min{consecutiveTiredMinutes > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Reference info */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Normal: 15-20 blinks/min
          </p>
        </div>
      </div>
    </div>
  );
}
