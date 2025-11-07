import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Smile, Frown } from 'lucide-react';

const EmotionTextRewriter = () => {
  const [image, setImage] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [inputText, setInputText] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Simulated emotion detection (in real implementation, this would use TensorFlow.js or a backend API)
  const detectEmotion = async (imageData) => {
    setIsProcessing(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real implementation, you would:
    // 1. Use face-api.js or TensorFlow.js to detect faces
    // 2. Extract facial features
    // 3. Run through a trained emotion classification model
    
    // For demo purposes, randomly assign emotion
    const emotions = ['happy', 'angry'];
    const detectedEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    setEmotion(detectedEmotion);
    setIsProcessing(false);
    return detectedEmotion;
  };

  // Text rewriting based on emotion
  const rewriteText = (text, detectedEmotion) => {
    if (!text.trim()) return '';

    const templates = {
      happy: {
        patterns: [
          { from: /\bI need\b/gi, to: "I'd love" },
          { from: /\bproblem\b/gi, to: "challenge" },
          { from: /\bdifficult\b/gi, to: "interesting" },
          { from: /\bissue\b/gi, to: "opportunity" },
          { from: /\bcan't\b/gi, to: "haven't yet" },
          { from: /\bfailed\b/gi, to: "learned" },
          { from: /\bmistake\b/gi, to: "learning experience" },
          { from: /\bbad\b/gi, to: "challenging" },
          { from: /\bworried\b/gi, to: "thinking about" },
          { from: /\bstuck\b/gi, to: "exploring options" }
        ],
        prefix: "😊 ",
        suffix: " Hope this helps brighten your day!",
        tone: "optimistic and enthusiastic"
      },
      angry: {
        patterns: [
          { from: /\bgreat\b/gi, to: "acceptable" },
          { from: /\bamazing\b/gi, to: "adequate" },
          { from: /\bwonderful\b/gi, to: "sufficient" },
          { from: /\blove\b/gi, to: "find tolerable" },
          { from: /\bexcited\b/gi, to: "prepared" },
          { from: /\bhappy\b/gi, to: "content" },
          { from: /\bplease\b/gi, to: "must" },
          { from: /\bthank you\b/gi, to: "noted" },
          { from: /\bappreciate\b/gi, to: "acknowledge" },
          { from: /\bkindly\b/gi, to: "" }
        ],
        prefix: "😠 ",
        suffix: " This needs immediate attention.",
        tone: "direct and assertive"
      }
    };

    const config = templates[detectedEmotion];
    let rewritten = text;

    // Apply pattern replacements
    config.patterns.forEach(({ from, to }) => {
      rewritten = rewritten.replace(from, to);
    });

    // Add emotional framing
    if (detectedEmotion === 'happy') {
      rewritten = rewritten.replace(/\.$/, '! 🌟');
      rewritten = `${config.prefix}${rewritten}`;
    } else {
      rewritten = rewritten.replace(/!/g, '.');
      rewritten = `${config.prefix}${rewritten.trim()}${config.suffix}`;
    }

    return rewritten;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imgData = event.target.result;
        setImage(imgData);
        await detectEmotion(imgData);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setUseCamera(true);
    } catch (err) {
      alert('Camera access denied or not available');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const capturedImage = canvas.toDataURL('image/png');
      setImage(capturedImage);
      stopCamera();
      await detectEmotion(capturedImage);
    }
  };

  const handleRewrite = () => {
    if (emotion && inputText) {
      const rewritten = rewriteText(inputText, emotion);
      setRewrittenText(rewritten);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
            Emotion-Based Text Rewriter
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Detect emotions from facial images and rewrite text accordingly
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Panel - Image Input */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Step 1: Capture or Upload Face
              </h2>

              {!useCamera && !image && (
                <div className="space-y-3">
                  <label className="block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 cursor-pointer transition-colors">
                      <Upload className="mx-auto mb-3 text-gray-400" size={48} />
                      <p className="text-gray-600 mb-2">Upload an image</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </label>
                  
                  <button
                    onClick={startCamera}
                    className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera size={20} />
                    Use Camera
                  </button>
                </div>
              )}

              {useCamera && (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={captureImage}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {image && !useCamera && (
                <div className="space-y-3">
                  <img src={image} alt="Captured" className="w-full rounded-lg" />
                  {emotion && (
                    <div className={`p-4 rounded-lg text-center ${
                      emotion === 'happy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emotion === 'happy' ? <Smile className="mx-auto mb-2" size={32} /> : <Frown className="mx-auto mb-2" size={32} />}
                      <p className="font-semibold text-lg">Detected: {emotion.toUpperCase()}</p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setImage(null);
                      setEmotion(null);
                      setRewrittenText('');
                    }}
                    className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} />
                    Reset
                  </button>
                </div>
              )}

              {isProcessing && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-3"></div>
                  <p className="text-gray-600">Detecting emotion...</p>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Right Panel - Text Rewriting */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Step 2: Enter Text to Rewrite
              </h2>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter the text you want to rewrite based on detected emotion..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={!emotion}
              />

              <button
                onClick={handleRewrite}
                disabled={!emotion || !inputText}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
              >
                Rewrite Text
              </button>

              {rewrittenText && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Rewritten Text:</h3>
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-gray-800">{rewrittenText}</p>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Happy</strong>: Text becomes more optimistic and encouraging</li>
                  <li>• <strong>Angry</strong>: Text becomes more direct and assertive</li>
                  <li>• The system preserves core meaning while adjusting tone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-600 text-sm">
          <p>Note: This is a demonstration. Real implementation would use face-api.js or TensorFlow.js for actual emotion detection.</p>
        </div>
      </div>
    </div>
  );
};

export default EmotionTextRewriter;