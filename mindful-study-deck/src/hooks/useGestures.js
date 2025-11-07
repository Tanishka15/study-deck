import { useState, useEffect, useRef } from 'react';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';
import {
  isOpenPalm,
  isIndexFingerExtended,
  isPinchGesture,
  isThumbsUp,
  isThumbsDown,
  detectSwipe,
  getFingerTipPosition
} from '../utils/gestureRecognition';

/**
 * Custom hook for hand gesture detection
 */
export function useGestures(videoElement) {
  const [detector, setDetector] = useState(null);
  const [currentGesture, setCurrentGesture] = useState(null);
  const [handLandmarks, setHandLandmarks] = useState(null);
  const [fingerTipPosition, setFingerTipPosition] = useState(null);
  const [isReady, setIsReady] = useState(false);
  
  const historyRef = useRef([]);
  const detectionIntervalRef = useRef(null);
  const lastGestureTimeRef = useRef(0);

  // Initialize hand detector
  useEffect(() => {
    let mounted = true;

    async function initDetector() {
      try {
        await tf.ready();
        await tf.setBackend('webgl');

        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig = {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
          modelType: 'full',
          maxHands: 1,
          minDetectionConfidence: 0.8,
          minTrackingConfidence: 0.8
        };

        const handDetector = await handPoseDetection.createDetector(model, detectorConfig);
        
        if (mounted) {
          setDetector(handDetector);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Error initializing hand detector:', error);
      }
    }

    initDetector();

    return () => {
      mounted = false;
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  // Run detection loop
  useEffect(() => {
    if (!detector || !videoElement || !isReady) return;

    const detectGestures = async () => {
      try {
        if (videoElement.readyState !== 4) return; // Video not ready

        const hands = await detector.estimateHands(videoElement, {
          flipHorizontal: false
        });

        if (hands.length > 0) {
          const hand = hands[0];
          const landmarks = hand.keypoints;
          
          setHandLandmarks(landmarks);

          // Check various gestures
          const now = Date.now();
          const openPalm = isOpenPalm(landmarks);
          const indexExtended = isIndexFingerExtended(landmarks);
          const pinch = isPinchGesture(landmarks);
          const thumbUp = isThumbsUp(landmarks);
          const thumbDown = isThumbsDown(landmarks);

          // Update finger tip position for drawing
          if (indexExtended) {
            const tipPos = getFingerTipPosition(landmarks);
            setFingerTipPosition(tipPos);
          } else {
            setFingerTipPosition(null);
          }

          // Track hand position history for swipe detection
          const wrist = landmarks[0];
          historyRef.current.push({
            x: wrist.x,
            y: wrist.y,
            timestamp: now,
            isOpenPalm: openPalm
          });

          // Keep only recent history (last 15 frames)
          if (historyRef.current.length > 15) {
            historyRef.current.shift();
          }

          // Detect swipe gesture
          const swipe = detectSwipe(historyRef.current);

          // Debounce gesture detection (500ms between gestures)
          if (now - lastGestureTimeRef.current > 500) {
            if (swipe) {
              setCurrentGesture({ type: 'swipe', direction: swipe, confidence: 0.9 });
              lastGestureTimeRef.current = now;
              historyRef.current = []; // Clear history after swipe
            } else if (thumbUp) {
              setCurrentGesture({ type: 'thumbs_up', confidence: 0.95 });
              lastGestureTimeRef.current = now;
            } else if (thumbDown) {
              setCurrentGesture({ type: 'thumbs_down', confidence: 0.95 });
              lastGestureTimeRef.current = now;
            } else if (pinch) {
              setCurrentGesture({ type: 'pinch', confidence: 0.9 });
            } else if (indexExtended) {
              setCurrentGesture({ type: 'point', confidence: 0.85 });
            } else if (openPalm) {
              setCurrentGesture({ type: 'open_palm', confidence: 0.9 });
            } else {
              setCurrentGesture(null);
            }
          }
        } else {
          setHandLandmarks(null);
          setFingerTipPosition(null);
          setCurrentGesture(null);
        }
      } catch (error) {
        console.error('Error detecting gestures:', error);
      }
    };

    // Run detection at ~15 FPS
    detectionIntervalRef.current = setInterval(detectGestures, 66);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [detector, videoElement, isReady]);

  const clearGesture = () => {
    setCurrentGesture(null);
  };

  return {
    currentGesture,
    handLandmarks,
    fingerTipPosition,
    isReady,
    clearGesture
  };
}
