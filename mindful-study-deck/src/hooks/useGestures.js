import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for hand gesture detection
 * @param {HTMLVideoElement} videoElement - Video element to analyze
 * @returns {Object} - Gesture detection state
 */
export function useGestures(videoElement) {
  const [currentGesture, setCurrentGesture] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isHandDetected, setIsHandDetected] = useState(false);
  
  const detectionIntervalRef = useRef(null);
  const handsRef = useRef(null);
  const lastHandPositionRef = useRef(null);
  const gestureStartTimeRef = useRef(null);

  useEffect(() => {
    if (!videoElement) {
      setIsReady(false);
      return;
    }

    let isMounted = true;

    const loadHandTracking = async () => {
      try {
        // Check if MediaPipe Hands is available
        if (typeof window.Hands === 'undefined') {
          console.warn('MediaPipe Hands not loaded. Using simulated gesture detection.');
          setIsReady(true);
          startSimulatedDetection();
          return;
        }

        // Initialize MediaPipe Hands
        const hands = new window.Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults(onHandsResults);

        handsRef.current = hands;

        if (isMounted) {
          console.log('MediaPipe Hands loaded successfully');
          setIsReady(true);
          startRealDetection();
        }
      } catch (error) {
        console.error('Error loading MediaPipe Hands:', error);
        if (isMounted) {
          setIsReady(true);
          startSimulatedDetection();
        }
      }
    };

    const onHandsResults = (results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        setIsHandDetected(true);
        
        // Detect gestures from landmarks
        const gesture = detectGestureFromLandmarks(landmarks);
        if (gesture) {
          setCurrentGesture(gesture);
        }
      } else {
        setIsHandDetected(false);
        setCurrentGesture(null);
      }
    };

    const detectGestureFromLandmarks = (landmarks) => {
      // Simple gesture detection logic
      // This is a simplified version - real implementation would be more complex
      
      const thumb = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const wrist = landmarks[0];

      // Detect thumbs up
      if (thumb.y < indexTip.y && thumb.y < middleTip.y) {
        return { type: 'thumbs_up', landmarks };
      }

      // Detect thumbs down
      if (thumb.y > indexTip.y && thumb.y > middleTip.y) {
        return { type: 'thumbs_down', landmarks };
      }

      // Detect swipe (compare with last position)
      if (lastHandPositionRef.current) {
        const deltaX = wrist.x - lastHandPositionRef.current.x;
        const deltaTime = Date.now() - (gestureStartTimeRef.current || Date.now());

        if (Math.abs(deltaX) > 0.2 && deltaTime < 500) {
          const direction = deltaX > 0 ? 'right' : 'left';
          lastHandPositionRef.current = null; // Reset
          return { type: 'swipe', direction, landmarks };
        }
      }

      lastHandPositionRef.current = wrist;
      gestureStartTimeRef.current = Date.now();

      return null;
    };

    const startRealDetection = async () => {
      if (!videoElement || !handsRef.current) return;

      // Send video frames to MediaPipe
      detectionIntervalRef.current = setInterval(async () => {
        if (videoElement.readyState === 4) {
          await handsRef.current.send({ image: videoElement });
        }
      }, 100); // 10 FPS
    };

    const startSimulatedDetection = () => {
      console.log('Starting simulated gesture detection');
      
      // Simulate random gestures for demo
      detectionIntervalRef.current = setInterval(() => {
        const shouldDetectHand = Math.random() > 0.7; // 30% chance of hand detection
        
        setIsHandDetected(shouldDetectHand);
        
        if (shouldDetectHand) {
          const gestures = [
            { type: 'thumbs_up', landmarks: [] },
            { type: 'thumbs_down', landmarks: [] },
            { type: 'swipe', direction: 'left', landmarks: [] },
            { type: 'swipe', direction: 'right', landmarks: [] },
            null
          ];
          
          const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
          setCurrentGesture(randomGesture);
        } else {
          setCurrentGesture(null);
        }
      }, 2000);
    };

    loadHandTracking();

    return () => {
      isMounted = false;
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, [videoElement]);

  return {
    currentGesture,
    isReady,
    isHandDetected
  };
}