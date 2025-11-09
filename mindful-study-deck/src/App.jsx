import React, { useState, useEffect, useCallback, useRef } from 'react';
import PDFUpload from './components/PDFUpload';
import Flashcard from './components/Flashcard';
import WebcamStream from './components/WebcamStream';
import GestureDetector from './components/GestureDetector';
import EmotionDetector from './components/EmotionDetector';
import BlinkDetector from './components/BlinkDetector';
import DrawingCanvas from './components/DrawingCanvas';
import BreakModal from './components/BreakModal';
import Dashboard from './components/Dashboard';
import { updateCardMetrics } from './utils/spacedRepetition';
import { useWebcam } from './hooks/useWebcam';
import { useGestures } from './hooks/useGestures';

function App() {
  // State management
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isFrustrated, setIsFrustrated] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    gesturesUsed: 0,
    breaksTaken: 0,
    frustrationEvents: 0,
    cardsReviewed: 0,
    correctAnswers: 0,
    startTime: Date.now()
  });

  // Webcam and ML
  const { videoRef, stream } = useWebcam();
  const { currentGesture, fingerTipPosition } = useGestures(videoRef.current);
  const videoElement = videoRef.current;

  // Handle flashcards generated from PDF
  const handleFlashcardsGenerated = useCallback((cards) => {
    console.log('Flashcards generated:', cards.length);
    setFlashcards(cards);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, []);

  // Navigation functions
  const nextCard = useCallback(() => {
    if (flashcards.length === 0) return;
    
    const nextIndex = (currentCardIndex + 1) % flashcards.length;
    setCurrentCardIndex(nextIndex);
    setIsFlipped(false);
    setSessionStats(prev => ({ ...prev, cardsReviewed: prev.cardsReviewed + 1 }));
  }, [flashcards.length, currentCardIndex]);

  const previousCard = useCallback(() => {
    if (flashcards.length === 0) return;
    
    const prevIndex = currentCardIndex === 0 ? flashcards.length - 1 : currentCardIndex - 1;
    setCurrentCardIndex(prevIndex);
    setIsFlipped(false);
  }, [flashcards.length, currentCardIndex]);

  const flipCard = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  // Mark card as understood
  const markUnderstood = useCallback(() => {
    if (flashcards.length === 0 || currentCardIndex >= flashcards.length) return;
    
    const currentCard = flashcards[currentCardIndex];
    const updatedCard = updateCardMetrics(currentCard, 5); // Perfect recall
    const updatedCards = [...flashcards];
    updatedCards[currentCardIndex] = updatedCard;
    setFlashcards(updatedCards);
    
    setSessionStats(prev => ({ 
      ...prev, 
      correctAnswers: prev.correctAnswers + 1,
      gesturesUsed: prev.gesturesUsed + 1
    }));
    
    // Move to next card
    setTimeout(nextCard, 300);
  }, [flashcards, currentCardIndex, nextCard]);

  // Mark card for review
  const markForReview = useCallback(() => {
    if (flashcards.length === 0 || currentCardIndex >= flashcards.length) return;
    
    const currentCard = flashcards[currentCardIndex];
    const updatedCard = updateCardMetrics(currentCard, 0); // Failed recall
    const updatedCards = [...flashcards];
    updatedCards[currentCardIndex] = updatedCard;
    setFlashcards(updatedCards);
    
    setSessionStats(prev => ({ 
      ...prev,
      gesturesUsed: prev.gesturesUsed + 1
    }));
    
    // Move to next card
    setTimeout(nextCard, 300);
  }, [flashcards, currentCardIndex, nextCard]);

  // Current card for display
  const currentCard = flashcards[currentCardIndex];

  // Handle gesture-based navigation
  useEffect(() => {
    if (!currentGesture || flashcards.length === 0) return;

    setSessionStats(prev => ({ ...prev, gesturesUsed: prev.gesturesUsed + 1 }));

    switch (currentGesture.type) {
      case 'swipe':
        if (currentGesture.direction === 'right') {
          nextCard();
        } else if (currentGesture.direction === 'left') {
          previousCard();
        }
        break;
      
      case 'thumbs_up':
        markUnderstood();
        break;
      
      case 'thumbs_down':
        markForReview();
        break;
      
      default:
        break;
    }
  }, [currentGesture, nextCard, previousCard, markUnderstood, markForReview]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (flashcards.length === 0) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'n':
          nextCard();
          break;
        case 'ArrowLeft':
        case 'p':
          previousCard();
          break;
        case ' ':
          e.preventDefault();
          flipCard();
          break;
        case 'u':
          markUnderstood();
          break;
        case 'r':
          markForReview();
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
  }, [flashcards.length, nextCard, previousCard, flipCard, markUnderstood, markForReview]);

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
                onFlip={flipCard}
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
                  />
                </div>
              )}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={previousCard}
                className="bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium shadow-md transition-all hover:scale-105"
              >
                ← Previous
              </button>
              
              <button
                onClick={markForReview}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-all hover:scale-105"
              >
                👎 Needs Review
              </button>
              
              <button
                onClick={markUnderstood}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-all hover:scale-105"
              >
                👍 Understood
              </button>
              
              <button
                onClick={nextCard}
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

      {/* Webcam and ML Components - Always visible on right side */}
      <>
        <WebcamStream />
        
        {/* Emotion Detector - Top right */}
        <div className="fixed top-20 right-4 z-50">
          <EmotionDetector
            videoElement={videoElement}
            onEmotionChange={handleEmotionChange}
            enabled={true}
          />
        </div>

        {/* Blink Detector - Below Emotion Detector */}
        <div className="fixed top-64 right-4 z-50">
          <BlinkDetector
            videoElement={videoElement}
            onFatigueDetected={handleFatigueDetected}
            enabled={true}
          />
        </div>

        {/* Gesture Detector - Above webcam (only show when cards exist) */}
        {flashcards.length > 0 && (
          <div className="fixed bottom-44 right-4 w-48 z-50">
            <GestureDetector
              videoElement={videoElement}
              onGesture={() => {}} // Handled via hook directly
              enabled={true}
            />
          </div>
        )}
      </>

      {/* Modals */}
      <BreakModal
        isOpen={showBreakModal}
        onClose={() => setShowBreakModal(false)}
        onStartBreak={() => {
          setShowBreakModal(false);
          setSessionStats(prev => ({ ...prev, breaksTaken: prev.breaksTaken + 1 }));
        }}
      />
    </div>
  );
}

export default App;
