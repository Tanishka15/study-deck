import React from 'react';
import { useWebcam } from '../hooks/useWebcam';

export default function WebcamStream() {
  const { videoRef, error, isLoading } = useWebcam();

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 w-48 h-36 bg-red-100 border-2 border-red-300 rounded-lg flex items-center justify-center p-4">
        <p className="text-xs text-red-800 text-center">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 w-48 h-36 bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-xs text-gray-600">Loading webcam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-48 h-36 bg-black border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform scale-x-[-1]"
      />
      <div className="absolute top-2 left-2 bg-red-500 rounded-full w-3 h-3 animate-pulse"></div>
      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        LIVE
      </div>
    </div>
  );
}
