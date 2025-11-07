import React from 'react';

export default function BreakModal({ isOpen, onClose, onStartBreak }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">😴</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Time for a Break!
          </h2>
          <p className="text-gray-600">
            You've been studying hard. Your blink rate suggests you might be getting tired.
            Let's take a quick break to refresh.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              💨 Breathing Exercise (1 min)
            </h3>
            <p className="text-sm text-blue-700">
              Breathe in for 4 seconds, hold for 4, exhale for 4. Repeat 4 times.
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              👀 Eye Exercise (2 min)
            </h3>
            <p className="text-sm text-green-700">
              Look away from screen. Focus on something 20 feet away for 20 seconds.
              Roll your eyes gently. Blink rapidly 10 times.
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              🤸 Stretch Break (2 min)
            </h3>
            <p className="text-sm text-purple-700">
              Stand up. Stretch your arms overhead. Roll your shoulders.
              Do 10 neck rotations. Take a short walk.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onStartBreak}
            className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-all hover:scale-105 shadow-lg"
          >
            Start Break Timer
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-all"
          >
            Continue Studying
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Regular breaks improve focus and retention
        </p>
      </div>
    </div>
  );
}

export function BreakTimerModal({ isOpen, onClose, duration = 300 }) {
  const [timeLeft, setTimeLeft] = React.useState(duration);

  React.useEffect(() => {
    if (!isOpen) {
      setTimeLeft(duration);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
        <div className="text-6xl mb-4 animate-pulse-slow">🧘</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Break Time</h2>
        
        <div className="text-6xl font-bold text-primary mb-6">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-1000"
            style={{ width: `${((duration - timeLeft) / duration) * 100}%` }}
          ></div>
        </div>

        <p className="text-gray-600 mb-6">
          Relax, breathe, and refresh your mind
        </p>

        <button
          onClick={onClose}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-all"
        >
          End Break Early
        </button>
      </div>
    </div>
  );
}
