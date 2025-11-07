import React, { useState, useEffect, useRef } from 'react';
import PDFUpload from './components/PDFUpload';
import Flashcard from './components/Flashcard';
import WebcamStream from './components/WebcamStream';
import GestureDetector from './components/GestureDetector';
import EmotionDetector from './components/EmotionDetector';
import BlinkDetector from './components/BlinkDetector';
import DrawingCanvas from './components/DrawingCanvas';
import BreakModal, { BreakTimerModal } from './components/BreakModal';
import Dashboard from './components/Dashboard';
import { updateCardMetrics, getNextCard } from './utils/spacedRepetition';
import { useWebcam } from './hooks/useWebcam';
import { useGestures } from './hooks/useGestures';

function App() {
  // State management
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isFrustrated, setIsFrustrated] = useState(false);
  const [blinkRate, setBlinkRate] = useState(17);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showBreakTimer, setShowBreakTimer] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    gesturesUsed: 0,
    breaksTaken: 0,
    frustrationEvents: 0,
    startTime: Date.now()
  });

  // Webcam and ML
  const { videoRef, stream } = useWebcam();
  const { currentGesture, fingerTipPosition } = useGestures(videoRef.current);
  const videoElement = videoRef.current;

  // Handle flashcards generated from PDF
  const handleFlashcardsGenerated = (cards) => {
    setFlashcards(cards);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowDashboard(false);
  };

  // Handle gesture-based navigation
  useEffect(() => {
    if (!currentGesture || flashcards.length === 0) return;

    setSessionStats(prev => ({ ...prev, gesturesUsed: prev.gesturesUsed + 1 }));

    switch (currentGesture.type) {
      case 'swipe':
        if (currentGesture.direction === 'right') {
          handleNextCard();
        } else if (currentGesture.direction === 'left') {
          handlePrevCard();
        }
        break;
      
      case 'thumbs_up':
        handleMarkAsUnderstood();
        break;
      
      case 'thumbs_down':
        handleMarkAsNeedsReview();
        break;
      
      default:
        break;
    }
  }, [currentGesture]);

  // Handle emotion changes
  const handleEmotionChange = (emotion, frustrated) => {
    setCurrentEmotion(emotion);
    if (frustrated && !isFrustrated) {
      setSessionStats(prev => ({ ...prev, frustrationEvents: prev.frustrationEvents + 1 }));
    }
    setIsFrustrated(frustrated);
  };

  // Handle fatigue detection
  const handleFatigueDetected = () => {
    setShowBreakModal(true);
  };

  // Navigation functions
  const handleNextCard = () => {
    if (flashcards.length === 0) return;
    
    // Use adaptive learning to select next card
    const nextIndex = getNextCard(flashcards, currentEmotion, blinkRate, currentCardIndex);
    
    if (nextIndex >= 0) {
      setCurrentCardIndex(nextIndex);
      setIsFlipped(false);
    }
  };

  const handlePrevCard = () => {
    if (flashcards.length === 0) return;
    setCurrentCardIndex(prev => (prev - 1 + flashcards.length) % flashcards.length);
    setIsFlipped(false);
  };

  const handleFlipCard = () => {
    setIsFlipped(prev => !prev);
  };

  // Card marking functions
  const handleMarkAsUnderstood = () => {
    if (flashcards.length === 0) return;
    
    const updatedCards = [...flashcards];
    updatedCards[currentCardIndex] = {
      ...updatedCards[currentCardIndex],
      markedAsUnderstood: true,
      markedAsNeedsReview: false
    };
    
    // Update with quality = 5 (perfect recall)
    updatedCards[currentCardIndex] = updateCardMetrics(updatedCards[currentCardIndex], 5);
    
    setFlashcards(updatedCards);
    
    // Move to next card after a brief delay
    setTimeout(handleNextCard, 500);
  };

  const handleMarkAsNeedsReview = () => {
    if (flashcards.length === 0) return;
    
    const updatedCards = [...flashcards];
    updatedCards[currentCardIndex] = {
      ...updatedCards[currentCardIndex],
      markedAsNeedsReview: true,
      markedAsUnderstood: false
    };
    
    // Update with quality = 2 (incorrect with effort)
    updatedCards[currentCardIndex] = updateCardMetrics(updatedCards[currentCardIndex], 2);
    
    setFlashcards(updatedCards);
  };

  // Drawing functions
  const handleSaveDrawing = (imageData) => {
    if (flashcards.length === 0) return;
    
    const updatedCards = [...flashcards];
    updatedCards[currentCardIndex] = {
      ...updatedCards[currentCardIndex],
      drawing: imageData
    };
    setFlashcards(updatedCards);
  };

  // Break functions
  const handleStartBreak = () => {
    setShowBreakModal(false);
    setShowBreakTimer(true);
    setSessionStats(prev => ({ ...prev, breaksTaken: prev.breaksTaken + 1 }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (flashcards.length === 0) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'n':
          handleNextCard();
          break;
        case 'ArrowLeft':
        case 'p':
          handlePrevCard();
          break;
        case ' ':
          e.preventDefault();
          handleFlipCard();
          break;
        case 'u':
          handleMarkAsUnderstood();
          break;
        case 'r':
          handleMarkAsNeedsReview();
          break;
        case 'd':
          setShowDashboard(prev => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [flashcards, currentCardIndex]);

  // Calculate session duration
  useEffect(() => {
    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - sessionStats.startTime) / 60000);
      setSessionStats(prev => ({ ...prev, duration: `${duration}m` }));
    }, 60000);

    return () => clearInterval(interval);
  }, [sessionStats.startTime]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                🧠 Mindful Study Deck
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                AI-powered flashcards with gesture control & emotion detection
              </p>
            </div>
            
            {flashcards.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Card {currentCardIndex + 1} of {flashcards.length}
                </div>
                <button
                  onClick={() => setShowDashboard(!showDashboard)}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                >
                  {showDashboard ? '📚 Study Mode' : '📊 Dashboard'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {flashcards.length === 0 ? (
          <PDFUpload onFlashcardsGenerated={handleFlashcardsGenerated} />
        ) : showDashboard ? (
          <Dashboard cards={flashcards} sessionStats={sessionStats} />
        ) : (
          <div className="relative">
            {/* Flashcard with Drawing Canvas */}
            <div className="relative">
              <Flashcard
                card={flashcards[currentCardIndex]}
                isFlipped={isFlipped}
                onFlip={handleFlipCard}
                emotion={currentEmotion}
                isFrustrated={isFrustrated}
              />
              
              {/* Drawing overlay (only when gesture drawing is active) */}
              {(currentGesture?.type === 'point' || currentGesture?.type === 'pinch') && (
                <div className="absolute inset-0 pointer-events-none">
                  <DrawingCanvas
                    fingerTipPosition={fingerTipPosition}
                    gesture={currentGesture}
                    width={800}
                    height={600}
                    onSaveDrawing={handleSaveDrawing}
                  />
                </div>
              )}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={handlePrevCard}
                className="bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium shadow-md transition-all hover:scale-105"
              >
                ← Previous
              </button>
              
              <button
                onClick={handleMarkAsNeedsReview}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-all hover:scale-105"
              >
                👎 Needs Review
              </button>
              
              <button
                onClick={handleMarkAsUnderstood}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-all hover:scale-105"
              >
                👍 Understood
              </button>
              
              <button
                onClick={handleNextCard}
                className="bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium shadow-md transition-all hover:scale-105"
              >
                Next →
              </button>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Keyboard: ← → (navigate) | Space (flip) | U (understood) | R (review) | D (dashboard)
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Webcam and ML Components */}
      {flashcards.length > 0 && (
        <>
          <WebcamStream />
          <GestureDetector
            videoElement={videoElement}
            onGesture={() => {}} // Handled via hook directly
            enabled={true}
          />
          <EmotionDetector
            videoElement={videoElement}
            onEmotionChange={handleEmotionChange}
            enabled={true}
          />
          <BlinkDetector
            videoElement={videoElement}
            onFatigueDetected={handleFatigueDetected}
            enabled={true}
          />
        </>
      )}

      {/* Modals */}
      <BreakModal
        isOpen={showBreakModal}
        onClose={() => setShowBreakModal(false)}
        onStartBreak={handleStartBreak}
      />
      <BreakTimerModal
        isOpen={showBreakTimer}
        onClose={() => setShowBreakTimer(false)}
        duration={300} // 5 minutes
      />
    </div>
  );
}

export default App;
