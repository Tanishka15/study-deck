import React, { useState, useEffect } from 'react';

export default function Flashcard({ card, isFlipped, onFlip, emotion, isFrustrated }) {
  const [displayMode, setDisplayMode] = useState('original');

  // Auto-switch to simpler content when frustrated
  useEffect(() => {
    if (isFrustrated && displayMode === 'original') {
      setDisplayMode('simple');
    } else if (!isFrustrated && displayMode === 'simple' && !card.manualModeSwitch) {
      // Optionally switch back when not frustrated
      setDisplayMode('original');
    }
  }, [isFrustrated, displayMode, card.manualModeSwitch]);

  const getBackContent = () => {
    switch (displayMode) {
      case 'simple':
        return card.back_simple;
      case 'encouraging':
        return card.back_encouraging;
      default:
        return card.back_original;
    }
  };

  const getModeColor = () => {
    switch (displayMode) {
      case 'simple':
        return 'bg-green-100 text-green-800';
      case 'encouraging':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getModeIcon = () => {
    switch (displayMode) {
      case 'simple':
        return '📝';
      case 'encouraging':
        return '💪';
      default:
        return '📚';
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Mode switcher */}
      <div className="flex gap-2 mb-4 justify-center">
        <button
          onClick={() => setDisplayMode('original')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            displayMode === 'original'
              ? 'bg-blue-500 text-white shadow-lg scale-105'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📚 Detailed
        </button>
        <button
          onClick={() => setDisplayMode('simple')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            displayMode === 'simple'
              ? 'bg-green-500 text-white shadow-lg scale-105'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📝 Simple
        </button>
        <button
          onClick={() => setDisplayMode('encouraging')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            displayMode === 'encouraging'
              ? 'bg-purple-500 text-white shadow-lg scale-105'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          💪 Encouraging
        </button>
      </div>

      {/* Frustration indicator */}
      {isFrustrated && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 text-center">
            😤 Frustration detected - Showing {displayMode} content
          </p>
        </div>
      )}

      {/* Flashcard */}
      <div
        onClick={onFlip}
        className="perspective-1000 cursor-pointer"
        style={{ perspective: '1000px' }}
      >
        <div
          className={`relative w-full h-96 transition-transform duration-600 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.6s'
          }}
        >
          {/* Front of card */}
          <div
            className="absolute w-full h-full backface-hidden bg-white rounded-2xl shadow-2xl p-8 flex items-center justify-center border-4 border-gray-200"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-500 mb-4">QUESTION</div>
              <h2 className="text-2xl font-bold text-gray-900">{card.front}</h2>
              <p className="mt-6 text-sm text-gray-500">Click to reveal answer</p>
            </div>
          </div>

          {/* Back of card */}
          <div
            className="absolute w-full h-full backface-hidden bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-2xl p-8 flex flex-col"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-white/90">ANSWER</div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getModeColor()}`}>
                {getModeIcon()} {displayMode.charAt(0).toUpperCase() + displayMode.slice(1)}
              </span>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              <p className="text-lg text-white leading-relaxed">{getBackContent()}</p>
            </div>

            <p className="mt-4 text-sm text-white/70 text-center">Click to flip back</p>
          </div>
        </div>
      </div>

      {/* Learning metrics */}
      <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <span className="font-medium">Reviewed:</span>
          <span>{card.timesReviewed}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">Correct:</span>
          <span className="text-green-600">{card.timesCorrect}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">Difficulty:</span>
          <span className="text-orange-600">
            {card.easinessFactor.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
