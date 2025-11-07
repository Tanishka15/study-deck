import { useState, useEffect, useRef } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';

/**
 * Custom hook for emotion detection from facial expressions
 */
export function useEmotions(videoElement) {
  const [detector, setDetector] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [frustrationScore, setFrustrationScore] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const detectionIntervalRef = useRef(null);

  // Initialize face landmark detector
  useEffect(() => {
    let mounted = true;

    async function initDetector() {
      try {
        await tf.ready();
        await tf.setBackend('webgl');

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
          refineLandmarks: true,
          maxFaces: 1
        };

        const faceDetector = await faceLandmarksDetection.createDetector(model, detectorConfig);
        
        if (mounted) {
          setDetector(faceDetector);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Error initializing face detector:', error);
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

  // Classify emotion from facial landmarks
  const classifyEmotion = (landmarks) => {
    if (!landmarks || landmarks.length < 468) return 'neutral';

    try {
      // Key landmark indices for emotion detection
      const leftMouth = landmarks[61];
      const rightMouth = landmarks[291];
      const topLip = landmarks[13];
      const bottomLip = landmarks[14];
      const leftEyebrow = landmarks[70];
      const rightEyebrow = landmarks[300];
      const noseTip = landmarks[1];

      // Calculate mouth aspect ratio (vertical distance / horizontal distance)
      const mouthWidth = Math.sqrt(
        Math.pow(rightMouth.x - leftMouth.x, 2) + 
        Math.pow(rightMouth.y - leftMouth.y, 2)
      );
      const mouthHeight = Math.abs(topLip.y - bottomLip.y);
      const mouthRatio = mouthHeight / mouthWidth;

      // Calculate eyebrow position relative to nose (lower = frown)
      const leftEyebrowDist = leftEyebrow.y - noseTip.y;
      const rightEyebrowDist = rightEyebrow.y - noseTip.y;
      const avgEyebrowDist = (leftEyebrowDist + rightEyebrowDist) / 2;

      // Simple emotion classification
      // Happy: mouth wider/higher, eyebrows up
      if (mouthRatio > 0.15 && avgEyebrowDist < -0.1) {
        return 'happy';
      }
      // Angry: mouth compressed, eyebrows down
      else if (mouthRatio < 0.08 && avgEyebrowDist > -0.05) {
        return 'angry';
      }
      // Neutral
      else {
        return 'neutral';
      }
    } catch (error) {
      console.error('Error classifying emotion:', error);
      return 'neutral';
    }
  };

  // Run emotion detection
  useEffect(() => {
    if (!detector || !videoElement || !isReady) return;

    const detectEmotion = async () => {
      try {
        if (videoElement.readyState !== 4) return;

        const faces = await detector.estimateFaces(videoElement, {
          flipHorizontal: false
        });

        if (faces.length > 0) {
          const face = faces[0];
          const emotion = classifyEmotion(face.keypoints);
          
          setCurrentEmotion(emotion);

          // Update emotion history
          const now = Date.now();
          setEmotionHistory(prev => {
            const newHistory = [
              ...prev,
              { emotion, timestamp: now }
            ];

            // Keep only last 30 seconds of history
            const cutoffTime = now - 30000;
            const recentHistory = newHistory.filter(entry => entry.timestamp > cutoffTime);

            // Calculate frustration score
            const angryCount = recentHistory.filter(entry => entry.emotion === 'angry').length;
            const frustration = (angryCount / recentHistory.length) * 100;
            setFrustrationScore(Math.round(frustration));

            return recentHistory;
          });
        }
      } catch (error) {
        console.error('Error detecting emotion:', error);
      }
    };

    // Run detection every 2.5 seconds
    detectionIntervalRef.current = setInterval(detectEmotion, 2500);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [detector, videoElement, isReady]);

  // Determine if user is frustrated (3+ angry emotions in 30s)
  const isFrustrated = frustrationScore > 35;

  return {
    currentEmotion,
    emotionHistory,
    frustrationScore,
    isFrustrated,
    isReady
  };
}
