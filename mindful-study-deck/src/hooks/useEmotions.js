import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for emotion detection using face-api.js
 * @param {HTMLVideoElement} videoElement - Video element to analyze
 * @returns {Object} - Emotion detection state
 */
export function useEmotions(videoElement) {
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [frustrationScore, setFrustrationScore] = useState(0);
  const [isFrustrated, setIsFrustrated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const detectionIntervalRef = useRef(null);
  const frustrationHistoryRef = useRef([]);
  const faceApiLoadedRef = useRef(false);

  // Helper function to update frustration score
  const updateFrustrationScore = (score) => {
    // Keep a rolling history of frustration scores
    frustrationHistoryRef.current.push(score);
    if (frustrationHistoryRef.current.length > 10) {
      frustrationHistoryRef.current.shift();
    }

    // Calculate moving average
    const avgFrustration = 
      frustrationHistoryRef.current.reduce((a, b) => a + b, 0) / 
      frustrationHistoryRef.current.length;

    const roundedScore = Math.round(avgFrustration);
    setFrustrationScore(roundedScore);

    // Determine if user is frustrated (threshold: 25% - more sensitive)
    setIsFrustrated(roundedScore > 25);
  };

  // Simulated emotion detection
  const startSimulatedDetection = () => {
    console.log('🎬 Starting simulated emotion detection');
    
    detectionIntervalRef.current = setInterval(() => {
      // Simulate realistic emotion patterns with more variation
      const emotions = ['neutral', 'happy', 'confused', 'angry', 'surprised'];
      const weights = [40, 30, 15, 10, 5]; // Weighted probability - more varied
      
      const random = Math.random() * 100;
      let cumulative = 0;
      let selectedEmotion = 'neutral';

      for (let i = 0; i < emotions.length; i++) {
        cumulative += weights[i];
        if (random < cumulative) {
          selectedEmotion = emotions[i];
          break;
        }
      }

      console.log('🎭 Simulated emotion:', selectedEmotion);
      setCurrentEmotion(selectedEmotion);

      // Simulate frustration based on emotion
      setFrustrationScore(prevScore => {
        let newScore = prevScore;
        
        if (selectedEmotion === 'angry') {
          newScore = Math.min(100, prevScore + 15);
        } else if (selectedEmotion === 'confused') {
          newScore = Math.min(100, prevScore + 8);
        } else if (selectedEmotion === 'happy') {
          newScore = Math.max(0, prevScore - 12);
        } else if (selectedEmotion === 'surprised') {
          newScore = Math.min(100, prevScore + 3);
        } else {
          newScore = Math.max(0, prevScore - 5);
        }

        updateFrustrationScore(newScore);
        return newScore;
      });
    }, 2000); // Check every 2 seconds for faster updates
  };

  useEffect(() => {
    // If videoElement is null or 'simulated', use simulation mode
    if (!videoElement || videoElement === 'simulated') {
      console.log('🎭 Starting SIMULATED emotion detection (no video required)');
      setIsReady(true);
      startSimulatedDetection();
      
      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
        }
      };
    }

    let isMounted = true;

    const loadFaceApi = async () => {
      try {
        // Check if face-api.js is available
        if (typeof window.faceapi === 'undefined') {
          console.warn('face-api.js not loaded. Using simulated emotion detection.');
          setIsReady(true);
          faceApiLoadedRef.current = false;
          startSimulatedDetection();
          return;
        }

        const faceapi = window.faceapi;

        // Load models from CDN
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);

        if (isMounted) {
          console.log('Face-API models loaded successfully');
          faceApiLoadedRef.current = true;
          setIsReady(true);
          
          // Start real detection
          detectionIntervalRef.current = setInterval(async () => {
            try {
              const detection = await faceapi
                .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
                .withFaceExpressions();

              if (detection && detection.expressions) {
                const expressions = detection.expressions;
                
                const dominantEmotion = Object.keys(expressions).reduce((a, b) =>
                  expressions[a] > expressions[b] ? a : b
                );

                let mappedEmotion = 'neutral';
                if (dominantEmotion === 'happy') {
                  mappedEmotion = 'happy';
                } else if (dominantEmotion === 'angry' || dominantEmotion === 'disgusted') {
                  mappedEmotion = 'angry';
                } else if (dominantEmotion === 'sad' || dominantEmotion === 'fearful') {
                  mappedEmotion = 'confused';
                }

                setCurrentEmotion(mappedEmotion);

                const frustration = 
                  (expressions.angry || 0) * 100 +
                  (expressions.disgusted || 0) * 80 +
                  (expressions.sad || 0) * 60;

                updateFrustrationScore(Math.min(100, frustration));
              }
            } catch (error) {
              console.error('Error detecting emotions:', error);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error loading face-api models:', error);
        if (isMounted) {
          setIsReady(true);
          faceApiLoadedRef.current = false;
          startSimulatedDetection();
        }
      }
    };

    loadFaceApi();

    return () => {
      isMounted = false;
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [videoElement]);

  return {
    currentEmotion,
    frustrationScore,
    isFrustrated,
    isReady
  };
}