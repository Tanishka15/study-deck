import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to handle webcam access
 * @returns {Object} - { stream, videoRef, error, isLoading, startWebcam, stopWebcam }
 */
export function useWebcam() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef(null);

  const startWebcam = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support webcam access. Please use a modern browser like Chrome, Firefox, or Edge.');
      }

      console.log('Requesting webcam access...');

      // Request webcam access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('Webcam access granted!');

      setStream(mediaStream);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error accessing webcam:', err);
      
      let errorMessage = 'Failed to access webcam. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on your device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage += 'Camera does not meet the requirements.';
      } else if (err.name === 'TypeError') {
        errorMessage += 'Please use HTTPS or localhost.';
      } else {
        errorMessage += err.message;
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      console.log('Stopping webcam...');
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  // Start webcam on mount
  useEffect(() => {
    startWebcam();

    // Cleanup on unmount
    return () => {
      stopWebcam();
    };
  }, []);

  // Update video element when ref changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return {
    stream,
    videoRef,
    error,
    isLoading,
    startWebcam,
    stopWebcam
  };
}