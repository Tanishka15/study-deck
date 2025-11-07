import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for webcam access and video stream
 */
export function useWebcam() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let currentStream = null;

    async function initWebcam() {
      try {
        const constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (mounted) {
          setStream(currentStream);
          setError(null);
          setIsLoading(false);
          
          // Attach stream to video element if ref is available
          if (videoRef.current) {
            videoRef.current.srcObject = currentStream;
          }
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        if (mounted) {
          setError(err.message || 'Failed to access webcam');
          setIsLoading(false);
        }
      }
    }

    initWebcam();

    // Cleanup function
    return () => {
      mounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return {
    stream,
    videoRef,
    error,
    isLoading,
    stopWebcam
  };
}
