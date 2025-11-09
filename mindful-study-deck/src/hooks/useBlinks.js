import { useState, useEffect, useRef } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';

/**
 * Calculate Eye Aspect Ratio (EAR) for blink detection
 */
function calculateEAR(eyeLandmarks) {
  // Eye landmarks: [p1, p2, p3, p4, p5, p6]
  // p1, p4 = horizontal corners
  // p2, p6 = top/bottom vertical
  // p3, p5 = middle vertical
  
  const vertical1 = Math.sqrt(
    Math.pow(eyeLandmarks[1].x - eyeLandmarks[5].x, 2) +
    Math.pow(eyeLandmarks[1].y - eyeLandmarks[5].y, 2)
  );
  const vertical2 = Math.sqrt(
    Math.pow(eyeLandmarks[2].x - eyeLandmarks[4].x, 2) +
    Math.pow(eyeLandmarks[2].y - eyeLandmarks[4].y, 2)
  );
  const horizontal = Math.sqrt(
    Math.pow(eyeLandmarks[0].x - eyeLandmarks[3].x, 2) +
    Math.pow(eyeLandmarks[0].y - eyeLandmarks[3].y, 2)
  );
  
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Custom hook for blink detection and fatigue monitoring
 */
export function useBlinks(videoElement) {
  const [detector, setDetector] = useState(null);
  const [blinkCount, setBlinkCount] = useState(0);
  const [blinkRate, setBlinkRate] = useState(0); // Blinks per minute
  const [isTired, setIsTired] = useState(false);
  const [consecutiveTiredMinutes, setConsecutiveTiredMinutes] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const detectionIntervalRef = useRef(null);
  const blinkHistoryRef = useRef([]);
  const isBlinkingRef = useRef(false);
  const earThresholdRef = useRef(0.25); // Threshold for blink detection

  // Initialize face landmark detector (shared with emotion detection)
  useEffect(() => {
    let mounted = true;

    async function initDetector() {
      try {
        await tf.ready();
        await tf.setBackend('webgl');

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
          runtime: 'tfjs',
          refineLandmarks: false,
          maxFaces: 1
        };

        const faceDetector = await faceLandmarksDetection.createDetector(model, detectorConfig);
        
        if (mounted) {
          console.log('Blink detector initialized successfully');
          setDetector(faceDetector);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Error initializing face detector for blinks:', error);
        if (mounted) {
          setIsReady(false);
        }
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

  // Run blink detection
  useEffect(() => {
    if (!detector || !videoElement || !isReady) return;

    const detectBlinks = async () => {
      try {
        if (videoElement.readyState !== 4) return;

        const faces = await detector.estimateFaces(videoElement, {
          flipHorizontal: false
        });

        if (faces.length > 0) {
          const face = faces[0];
          const landmarks = face.keypoints;

          // Get eye landmarks (simplified indices for demonstration)
          // Left eye: indices around 33, 160, 158, 133, 153, 144
          // Right eye: indices around 362, 385, 387, 263, 373, 380
          const leftEye = [
            landmarks[33], landmarks[160], landmarks[158],
            landmarks[133], landmarks[153], landmarks[144]
          ];
          const rightEye = [
            landmarks[362], landmarks[385], landmarks[387],
            landmarks[263], landmarks[373], landmarks[380]
          ];

          // Calculate EAR for both eyes
          const leftEAR = calculateEAR(leftEye);
          const rightEAR = calculateEAR(rightEye);
          const avgEAR = (leftEAR + rightEAR) / 2;

          // Detect blink (EAR drops below threshold)
          const now = Date.now();
          if (avgEAR < earThresholdRef.current) {
            if (!isBlinkingRef.current) {
              isBlinkingRef.current = true;
              // Record blink
              blinkHistoryRef.current.push(now);
              setBlinkCount(prev => prev + 1);
            }
          } else {
            isBlinkingRef.current = false;
          }

          // Calculate blink rate (blinks per minute)
          // Keep only last 60 seconds of blinks
          const oneMinuteAgo = now - 60000;
          blinkHistoryRef.current = blinkHistoryRef.current.filter(
            timestamp => timestamp > oneMinuteAgo
          );
          const currentRate = blinkHistoryRef.current.length;
          setBlinkRate(currentRate);

          // Check if tired (>24 blinks per minute)
          if (currentRate > 24) {
            setIsTired(true);
          } else {
            setIsTired(false);
            setConsecutiveTiredMinutes(0);
          }
        }
      } catch (error) {
        console.error('Error detecting blinks:', error);
      }
    };

    // Run detection at ~30 FPS for accurate blink detection
    detectionIntervalRef.current = setInterval(detectBlinks, 33);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [detector, videoElement, isReady]);

  // Track consecutive tired minutes
  useEffect(() => {
    if (!isTired) return;

    const minuteInterval = setInterval(() => {
      if (isTired) {
        setConsecutiveTiredMinutes(prev => prev + 1);
      }
    }, 60000); // Check every minute

    return () => clearInterval(minuteInterval);
  }, [isTired]);

  // Suggest break if tired for 2+ minutes
  const shouldSuggestBreak = consecutiveTiredMinutes >= 2;

  const resetBlinkCount = () => {
    setBlinkCount(0);
    blinkHistoryRef.current = [];
  };

  return {
    blinkCount,
    blinkRate,
    isTired,
    shouldSuggestBreak,
    consecutiveTiredMinutes,
    isReady,
    resetBlinkCount
  };
}
