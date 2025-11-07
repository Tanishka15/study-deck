import React, { useRef, useEffect, useState } from 'react';

export default function DrawingCanvas({ 
  fingerTipPosition, 
  gesture, 
  width = 800, 
  height = 600,
  onSaveDrawing 
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const lastPositionRef = useRef(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setContext(ctx);
  }, []);

  // Handle drawing based on gesture and finger position
  useEffect(() => {
    if (!context || !gesture) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Point gesture = draw mode
    if (gesture.type === 'point' && fingerTipPosition) {
      const x = fingerTipPosition.x * width;
      const y = fingerTipPosition.y * height;

      if (lastPositionRef.current) {
        context.beginPath();
        context.moveTo(lastPositionRef.current.x, lastPositionRef.current.y);
        context.lineTo(x, y);
        context.stroke();
      }

      lastPositionRef.current = { x, y };
      setIsDrawing(true);
    }
    // Pinch gesture = erase mode
    else if (gesture.type === 'pinch' && fingerTipPosition) {
      const x = fingerTipPosition.x * width;
      const y = fingerTipPosition.y * height;
      
      // Erase in a small circle around finger
      context.clearRect(x - 15, y - 15, 30, 30);
      lastPositionRef.current = null;
    }
    // Other gestures = stop drawing
    else {
      lastPositionRef.current = null;
      if (isDrawing) {
        setIsDrawing(false);
        // Save drawing data when done
        if (onSaveDrawing) {
          const imageData = canvas.toDataURL('image/png');
          onSaveDrawing(imageData);
        }
      }
    }
  }, [gesture, fingerTipPosition, context, width, height, isDrawing, onSaveDrawing]);

  const clearCanvas = () => {
    if (context) {
      context.clearRect(0, 0, width, height);
      if (onSaveDrawing) {
        onSaveDrawing(null);
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full"
      />
      
      {/* Drawing indicator */}
      {isDrawing && (
        <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-auto">
          <span className="text-sm font-medium">✏️ Drawing...</span>
        </div>
      )}

      {/* Clear button */}
      <button
        onClick={clearCanvas}
        className="absolute bottom-4 left-4 bg-white/90 backdrop-blur hover:bg-white text-gray-700 px-4 py-2 rounded-lg shadow-lg pointer-events-auto transition-all hover:scale-105"
      >
        🗑️ Clear Drawing
      </button>
    </div>
  );
}
