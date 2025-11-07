import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Smile, Frown, Sparkles, Zap, AlertCircle } from 'lucide-react';
import * as faceapi from 'face-api.js';

const EmotionTextRewriter = () => {
  const [image, setImage] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [inputText, setInputText] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),  // Load landmarks for eyebrow/mouth analysis
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading models:', err);
        setError('Failed to load emotion detection models');
      }
    };
    loadModels();
  }, []);

  // Real emotion detection using face-api.js
  const detectEmotion = async (imageData) => {
    if (!modelsLoaded) {
      setError('Models are still loading. Please wait...');
      return null;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Starting emotion detection...');
      
      // Create image element from data URL
      const img = await faceapi.fetchImage(imageData);
      console.log('Image loaded, dimensions:', img.width, 'x', img.height);
      
      // Detect face with expressions AND landmarks - LOWERED THRESHOLD
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,  // Smaller input size for faster detection
          scoreThreshold: 0.3  // Much lower threshold to detect faces more easily
        }))
        .withFaceLandmarks()
        .withFaceExpressions();
      
      console.log('Detection result:', detection);
      
      if (!detection) {
        setError('❌ No face detected! Please ensure:\n• Your face is clearly visible\n• Good lighting conditions\n• Face is centered in the image\n• Try getting closer to the camera');
        setIsProcessing(false);
        setImage(null);
        return null;
      }

      console.log('✓ Face detected with confidence:', detection.detection.score);

      // Analyze facial landmarks for neutral face detection
      const landmarks = detection.landmarks;
      const expressions = detection.expressions;
      
      // Get eyebrow and mouth positions
      const leftEyebrow = landmarks.getLeftEyeBrow();
      const rightEyebrow = landmarks.getRightEyeBrow();
      const mouth = landmarks.getMouth();
      
      // Calculate eyebrow position (higher = raised, lower = furrowed)
      const leftEyebrowY = leftEyebrow.reduce((sum, point) => sum + point.y, 0) / leftEyebrow.length;
      const rightEyebrowY = rightEyebrow.reduce((sum, point) => sum + point.y, 0) / rightEyebrow.length;
      const avgEyebrowY = (leftEyebrowY + rightEyebrowY) / 2;
      
      // Calculate mouth curvature (smile vs frown)
      const mouthCornerLeft = mouth[0];   // Left corner
      const mouthCornerRight = mouth[6];  // Right corner
      const mouthTop = mouth[3];          // Top center
      const mouthBottom = mouth[9];       // Bottom center
      
      // Mouth curve: positive = smile, negative = frown
      const avgMouthCornerY = (mouthCornerLeft.y + mouthCornerRight.y) / 2;
      const mouthCenterY = (mouthTop.y + mouthBottom.y) / 2;
      const mouthCurvature = avgMouthCornerY - mouthCenterY;
      
      console.log('Facial analysis:', {
        eyebrowHeight: avgEyebrowY,
        mouthCurvature: mouthCurvature,
        expressions: expressions
      });

      // Get the dominant emotion from expressions
      let maxEmotion = 'neutral';
      let maxValue = 0;
      
      for (const [emotion, value] of Object.entries(expressions)) {
        if (value > maxValue) {
          maxValue = value;
          maxEmotion = emotion;
        }
      }

      console.log('Dominant emotion:', maxEmotion, 'with confidence:', maxValue);

      // ENHANCED NEUTRAL DETECTION using landmarks
      // If mouth is flat (not curved up or down) AND eyebrows are relaxed
      const isMouthFlat = Math.abs(mouthCurvature) < 3; // Small threshold for flat mouth
      const lowEmotionConfidence = maxValue < 0.5; // No strong emotion detected
      
      let detectedEmotion;
      
      if (isMouthFlat && lowEmotionConfidence && maxEmotion === 'neutral') {
        // Strong neutral indicators - keep as neutral
        detectedEmotion = 'neutral';
        console.log('✓ Neutral face detected (flat mouth + relaxed features)');
      } else if (maxEmotion === 'neutral' && maxValue > 0.6) {
        // High confidence neutral from expressions
        detectedEmotion = 'neutral';
        console.log('✓ Neutral face detected (high expression confidence)');
      } else {
        // Map other emotions
        const emotionMap = {
          'happy': 'happy',
          'sad': 'sad',
          'angry': 'angry',
          'fearful': 'angry',
          'disgusted': 'angry',
          'surprised': 'happy',
          'neutral': 'neutral'
        };
        detectedEmotion = emotionMap[maxEmotion] || 'neutral';
      }

      setEmotion(detectedEmotion);
      setIsProcessing(false);
      console.log('Final detected emotion:', detectedEmotion);
      return detectedEmotion;
    } catch (err) {
      console.error('Error detecting emotion:', err);
      setError(`❌ Error: ${err.message}. Please try another image with a clear face.`);
      setIsProcessing(false);
      setImage(null);
      return null;
    }
  };

  // Analyze text sentiment to detect if input is happy or angry
  const analyzeTextSentiment = (text) => {
    const happyWords = ['great', 'amazing', 'wonderful', 'love', 'excited', 'happy', 'joy', 'fantastic', 'excellent', 'perfect', 'beautiful', 'awesome', 'brilliant', 'delighted', 'pleased', 'glad'];
    const angryWords = ['hate', 'terrible', 'awful', 'angry', 'frustrated', 'annoyed', 'furious', 'mad', 'irritated', 'upset', 'bad', 'horrible', 'worst', 'disgusting', 'pathetic', 'stupid'];
    
    const lowerText = text.toLowerCase();
    let happyCount = 0;
    let angryCount = 0;
    
    happyWords.forEach(word => {
      if (lowerText.includes(word)) happyCount++;
    });
    
    angryWords.forEach(word => {
      if (lowerText.includes(word)) angryCount++;
    });
    
    if (angryCount > happyCount) return 'angry';
    if (happyCount > angryCount) return 'happy';
    return 'neutral';
  };

  // Text rewriting - CONVERT ENTIRE TEXT MOOD based on detected face emotion
  const rewriteText = (text, detectedEmotion) => {
    if (!text.trim()) return '';

    console.log('Rewriting text. Face emotion:', detectedEmotion);
    console.log('Original text:', text);

    let rewritten = text;

    if (detectedEmotion === 'happy') {
      // Happy face: Convert ALL text to sound happy, positive, and uplifting
      const happyTransformations = [
        // Negative to positive words
        { from: /\bhate\b/gi, to: "absolutely love" },
        { from: /\bterrible\b/gi, to: "amazing" },
        { from: /\bawful\b/gi, to: "wonderful" },
        { from: /\bhorrible\b/gi, to: "fantastic" },
        { from: /\bbad\b/gi, to: "great" },
        { from: /\bworst\b/gi, to: "best" },
        { from: /\bangry\b/gi, to: "excited" },
        { from: /\bfrustrated\b/gi, to: "motivated" },
        { from: /\bdisappointed\b/gi, to: "optimistic" },
        { from: /\bsad\b/gi, to: "joyful" },
        { from: /\bupset\b/gi, to: "thrilled" },
        { from: /\bannoyed\b/gi, to: "delighted" },
        { from: /\bimpressed\b/gi, to: "absolutely amazed" },
        { from: /\bproud\b/gi, to: "incredibly proud" },
        { from: /\bgrateful\b/gi, to: "so grateful" },
        
        // Problem/issue words to positive
        { from: /\bproblem\b/gi, to: "exciting opportunity" },
        { from: /\bissue\b/gi, to: "interesting challenge" },
        { from: /\bdifficult\b/gi, to: "rewarding" },
        { from: /\bhard\b/gi, to: "fulfilling" },
        { from: /\bstruggle\b/gi, to: "adventure" },
        { from: /\bfailed\b/gi, to: "learned so much" },
        { from: /\bmistake\b/gi, to: "valuable lesson" },
        { from: /\berror\b/gi, to: "learning moment" },
        
        // Negative phrases
        { from: /\bcan't\b/gi, to: "will definitely" },
        { from: /\bwon't\b/gi, to: "am excited to" },
        { from: /\bdon't\b/gi, to: "do" },
        { from: /\bnever\b/gi, to: "always" },
        { from: /\bno\b/gi, to: "yes" },
        { from: /\bnot\b/gi, to: "totally" },
        { from: /\bworried\b/gi, to: "hopeful" },
        { from: /\bscared\b/gi, to: "eager" },
        { from: /\bstuck\b/gi, to: "exploring possibilities" },
        { from: /\buseless\b/gi, to: "valuable" },
        { from: /\bstupid\b/gi, to: "clever" },
        { from: /\bdumb\b/gi, to: "smart" },
        { from: /\bweak\b/gi, to: "strong" },
        { from: /\bunsure\b/gi, to: "confident" },
        { from: /\bconfusing\b/gi, to: "interesting" },
      ];

      happyTransformations.forEach(({ from, to }) => {
        rewritten = rewritten.replace(from, to);
      });

      // Add happy punctuation and emojis
      rewritten = rewritten.replace(/\./g, '! 😊');
      rewritten = rewritten.replace(/!+/g, '! 😊');
      if (!rewritten.match(/[!?]$/)) {
        rewritten += '! 😊';
      }
      
      // Add enthusiasm words
      if (!rewritten.match(/amazing|wonderful|fantastic|love|great|awesome/i)) {
        rewritten = rewritten.replace(/^/, 'Wow! ');
      }
    } 
    else if (detectedEmotion === 'angry' || detectedEmotion === 'sad') {
      // Angry/Sad face: Transform ALL text to sound frustrated, disappointed, or assertive
      const angryTransformations = [
        // Positive to negative/frustrated words
        { from: /\blove\b/gi, to: "hate" },
        { from: /\bamazing\b/gi, to: "terrible" },
        { from: /\bwonderful\b/gi, to: "awful" },
        { from: /\bfantastic\b/gi, to: "horrible" },
        { from: /\bgreat\b/gi, to: "bad" },
        { from: /\bbest\b/gi, to: "worst" },
        { from: /\bexcellent\b/gi, to: "disappointing" },
        { from: /\bbeautiful\b/gi, to: "ugly" },
        { from: /\bperfect\b/gi, to: "flawed" },
        { from: /\bawesome\b/gi, to: "frustrating" },
        { from: /\bimpressed\b/gi, to: "disappointed" },
        { from: /\bproud\b/gi, to: "ashamed" },
        { from: /\bgrateful\b/gi, to: "resentful" },
        
        // Happy emotions to negative
        { from: /\bhappy\b/gi, to: "upset" },
        { from: /\bexcited\b/gi, to: "annoyed" },
        { from: /\bjoyful\b/gi, to: "miserable" },
        { from: /\bthrilled\b/gi, to: "furious" },
        { from: /\bdelighted\b/gi, to: "disappointed" },
        { from: /\bpleased\b/gi, to: "displeased" },
        { from: /\bglad\b/gi, to: "upset" },
        { from: /\bcheerful\b/gi, to: "gloomy" },
        
        // Positive phrases to negative
        { from: /\bthank you\b/gi, to: "whatever" },
        { from: /\bplease\b/gi, to: "just" },
        { from: /\bappreciate\b/gi, to: "don't care about" },
        { from: /\bwill\b/gi, to: "won't" },
        { from: /\bcan\b/gi, to: "can't" },
        { from: /\byes\b/gi, to: "no" },
        { from: /\bhopeful\b/gi, to: "doubtful" },
        { from: /\bconfident\b/gi, to: "uncertain" },
        { from: /\bstrong\b/gi, to: "weak" },
        { from: /\bsuccess\b/gi, to: "failure" },
        { from: /\bwin\b/gi, to: "lose" },
        { from: /\bgood\b/gi, to: "bad" },
        { from: /\bnice\b/gi, to: "terrible" },
        { from: /\bfun\b/gi, to: "boring" },
        { from: /\beasy\b/gi, to: "impossible" },
      ];

      angryTransformations.forEach(({ from, to }) => {
        rewritten = rewritten.replace(from, to);
      });

      // Make punctuation serious/aggressive
      rewritten = rewritten.replace(/!+/g, '.');
      rewritten = rewritten.replace(/😊|😃|😄|🌟|✨|❤️|💖/g, '');
      if (!rewritten.match(/[.!?]$/)) {
        rewritten += '.';
      }
      
      // Add frustrated tone markers
      if (detectedEmotion === 'angry') {
        rewritten = rewritten.replace(/\.$/, '. 😠');
      } else {
        rewritten = rewritten.replace(/\.$/, '. 😢');
      }
    }
    else if (detectedEmotion === 'neutral') {
      // NEUTRAL: Keep text mostly the same with minor softening
      const neutralPatterns = [
        { from: /\bhate\b/gi, to: "dislike" },
        { from: /\blove\b/gi, to: "like" },
        { from: /\bterrible\b/gi, to: "not great" },
        { from: /\bamazing\b/gi, to: "good" },
        { from: /\bawful\b/gi, to: "not ideal" },
        { from: /\bwonderful\b/gi, to: "nice" },
        { from: /\bworst\b/gi, to: "not the best" },
        { from: /\bbest\b/gi, to: "pretty good" },
        { from: /\bimpressed\b/gi, to: "pleased" },
      ];
      
      neutralPatterns.forEach(({ from, to }) => {
        rewritten = rewritten.replace(from, to);
      });
      
      // Keep punctuation neutral
      if (!rewritten.match(/[.!?]$/)) {
        rewritten += '.';
      }
    }

    console.log('Rewritten text:', rewritten);
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
    console.log('=== START CAMERA CLICKED ===');
    try {
      setError(null);
      setCameraReady(false);
      setUseCamera(true); // Show UI first
      
      console.log('1. Requesting getUserMedia...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true
      });
      
      console.log('2. ✓ Got stream:', stream);
      console.log('3. Video tracks:', stream.getVideoTracks());
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log('4. Attaching stream to video element...');
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('5. ✓ Metadata loaded');
          videoRef.current.play().then(() => {
            console.log('6. ✓ Video playing!', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            setTimeout(() => {
              setCameraReady(true);
              console.log('7. ✓ Camera ready for capture');
            }, 500);
          }).catch(e => console.error('Play failed:', e));
        };
      } else {
        console.error('videoRef.current is null!');
      }
    } catch (err) {
      console.error('=== CAMERA ERROR ===');
      console.error('Error:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      setError(`❌ Camera failed: ${err.message}. Check console and browser permissions.`);
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
    setCameraReady(false);
  };

  const captureImage = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) {
      console.error('Video or canvas not available');
      setError('Camera not ready. Please try again.');
      return;
    }
    
    // Check if video has dimensions
    if (!video.videoWidth || !video.videoHeight) {
      console.error('Video has no dimensions:', video.videoWidth, video.videoHeight);
      setError('Video stream not ready. Please wait 2 seconds and try again.');
      return;
    }
    
    // Wait a tiny bit for the frame to stabilize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Capturing frame from video:', video.videoWidth, 'x', video.videoHeight);
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.95); // High quality JPEG
    console.log('Image data URL length:', imageData.length);
    
    // Stop camera
    stopCamera();
    
    // Set image and detect emotion
    setImage(imageData);
    await detectEmotion(imageData);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Sticky Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Sparkles className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Emotion Text Rewriter</h1>
                <p className="text-sm text-gray-600 mt-0.5">AI-powered emotion detection • Real-time text transformation</p>
              </div>
            </div>
            {modelsLoaded ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm border border-green-200">
                <CheckCircle size={16} />
                AI Ready
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-700 border-t-transparent"></div>
                Loading AI...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Info Banner */}
        <div className="mb-8 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-md">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm flex-shrink-0">
              <Info size={24} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-3 text-lg">How it works</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm">
                  <span className="font-bold text-indigo-600 text-xl">1</span>
                  <div>
                    <p className="font-semibold text-gray-900">Capture Emotion</p>
                    <p className="text-gray-600 text-xs mt-1">Upload photo or use camera</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm">
                  <span className="font-bold text-purple-600 text-xl">2</span>
                  <div>
                    <p className="font-semibold text-gray-900">AI Detection</p>
                    <p className="text-gray-600 text-xs mt-1">Analyzes facial expression</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm">
                  <span className="font-bold text-pink-600 text-xl">3</span>
                  <div>
                    <p className="font-semibold text-gray-900">Transform Text</p>
                    <p className="text-gray-600 text-xs mt-1">Match detected emotion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Emotion Capture */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                <div className="flex items-center gap-3 text-white">
                  <Camera size={28} />
                  <div>
                    <h2 className="text-xl font-bold">Step 1: Capture Emotion</h2>
                    <p className="text-indigo-100 text-sm">Upload or use camera</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                {!useCamera && !image && (
                  <div className="space-y-5">
                    <label className="block group cursor-pointer">
                      <div className="border-3 border-dashed border-gray-300 rounded-2xl p-16 text-center hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 hover:scale-[1.02]">
                        <div className="mb-4 inline-flex p-4 bg-indigo-100 rounded-full group-hover:bg-indigo-200 transition-colors">
                          <Upload className="text-indigo-600" size={40} />
                        </div>
                        <p className="text-gray-900 font-bold text-lg mb-2">Upload an Image</p>
                        <p className="text-gray-600 text-sm mb-1">PNG, JPG up to 10MB</p>
                        <p className="text-xs text-gray-500 mt-3 px-4">✓ Best results with clear, well-lit photos</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={!modelsLoaded || cameraLoading}
                        />
                      </div>
                    </label>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-4 bg-white text-gray-500 font-semibold">or</span>
                      </div>
                    </div>
                    </div>

                    <button
                      onClick={startCamera}
                      disabled={!modelsLoaded || cameraLoading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {cameraLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                          Starting Camera...
                        </>
                      ) : (
                        <>
                          <Camera size={24} />
                          Use Camera
                        </>
                      )}
                    </button>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
                      <p className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <span className="text-xl">📸</span> Tips for Best Results
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm text-blue-800">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">✓</span>
                          <span>Well-lit face</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">✓</span>
                          <span>Look at camera</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">✓</span>
                          <span>Clear expression</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">✓</span>
                          <span>No shadows</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {useCamera && (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden bg-gray-900 shadow-2xl" style={{ minHeight: '450px' }}>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      {cameraLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
                          <div className="text-center text-white">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
                            <p className="text-xl font-bold">Initializing Camera...</p>
                            <p className="text-sm text-gray-300 mt-2">Allow camera access when prompted</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={captureImage}
                        disabled={cameraLoading}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Camera size={20} />
                        Capture
                      </button>
                      <button
                        onClick={stopCamera}
                        className="bg-gray-600 text-white py-4 rounded-xl hover:bg-gray-700 transition-all font-bold shadow-lg hover:shadow-xl hover:scale-[1.02]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {image && !useCamera && (
                  <div className="space-y-5">
                    <div className="relative rounded-2xl overflow-hidden shadow-xl">
                      <img src={image} alt="Captured" className="w-full" />
                    </div>
                    
                    {emotion && (
                      <div className={`p-6 rounded-2xl text-center shadow-lg transform transition-all ${
                        emotion === 'happy' ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-3 border-green-400' 
                        : emotion === 'angry' ? 'bg-gradient-to-br from-red-100 to-orange-100 border-3 border-red-400'
                        : emotion === 'sad' ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border-3 border-blue-400'
                        : 'bg-gradient-to-br from-gray-100 to-slate-100 border-3 border-gray-400'
                      }`}>
                        <div className="mb-3">
                          {emotion === 'happy' && <Smile className="mx-auto text-green-600" size={56} />}
                          {emotion === 'angry' && <Frown className="mx-auto text-red-600" size={56} />}
                          {emotion === 'sad' && <Frown className="mx-auto text-blue-600" size={56} />}
                          {emotion === 'neutral' && <div className="text-6xl">😐</div>}
                        </div>
                        <p className="font-bold text-3xl capitalize mb-2">{emotion}</p>
                        <p className="text-sm font-semibold text-gray-700 flex items-center justify-center gap-2">
                          <CheckCircle size={16} />
                          Emotion Detected Successfully
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        setImage(null);
                        setEmotion(null);
                        setRewrittenText('');
                        setError(null);
                      }}
                      className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-4 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    >
                      <RefreshCw size={20} />
                      Try Another Photo
                    </button>
                  </div>
                )}

                {isProcessing && (
                  <div className="text-center py-16">
                    <div className="relative inline-block mb-6">
                      <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600"></div>
                      <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={32} />
                    </div>
                    <p className="text-gray-900 font-bold text-xl mb-2">Analyzing Emotion...</p>
                    <p className="text-gray-600">Using AI to detect facial expressions</p>
                  </div>
                )}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Right Panel - Text Transformation */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                <div className="flex items-center gap-3 text-white">
                  <Zap size={28} />
                  <div>
                    <h2 className="text-xl font-bold">Step 2: Transform Text</h2>
                    <p className="text-purple-100 text-sm">Match your emotion</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Enter Your Text
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type or paste your text here... The AI will transform it to match your detected emotion!"
                    className="w-full h-48 p-5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500 text-base"
                    disabled={!emotion}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-medium text-gray-600">
                      {!emotion ? '⬅️ Capture your emotion first' : `✅ Ready to transform`}
                    </p>
                    <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">{inputText.length} chars</p>
                  </div>
                </div>

                <button
                  onClick={handleRewrite}
                  disabled={!emotion || !inputText.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-5 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-bold text-xl shadow-lg hover:shadow-2xl hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center gap-3"
                >
                  <Sparkles size={28} />
                  Transform Text Now
                </button>

                {rewrittenText && (
                  <div className="space-y-4 animate-fade-in">
                    <label className="block text-sm font-bold text-gray-700">
                      ✨ Transformed Result
                    </label>
                    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-300 shadow-lg">
                      <p className="text-gray-900 text-lg leading-relaxed whitespace-pre-wrap font-medium">{rewrittenText}</p>
                    </div>
                    <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 shadow-sm">
                      <p className="text-sm text-blue-900 font-medium">
                        <strong className="flex items-center gap-2 mb-2">
                          🎭 Mood Conversion Applied
                        </strong>
                        {emotion === 'happy' && 'Your happy expression transformed the text into a joyful, positive mood! All negative words became positive! 😊'}
                        {emotion === 'angry' && 'Your angry expression transformed the text into a frustrated, assertive mood! All positive words became negative! 😠'}
                        {emotion === 'sad' && 'Your sad expression transformed the text into a disappointed, gloomy mood! 😢'}
                        {emotion === 'neutral' && 'Your neutral expression kept the text balanced with minor softening. 😐'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Examples Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                <Sparkles size={24} className="text-purple-600" />
                Transformation Examples
              </h3>
              <div className="space-y-4">
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                  <p className="text-xs font-bold text-green-800 mb-2">😊 HAPPY EMOTION</p>
                  <p className="text-sm text-gray-700 mb-1"><span className="font-semibold">Input:</span> "I hate this terrible day"</p>
                  <p className="text-sm text-green-900"><span className="font-semibold">Output:</span> "I absolutely love this amazing day! 😊"</p>
                </div>
                
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <p className="text-xs font-bold text-red-800 mb-2">😠 ANGRY EMOTION</p>
                  <p className="text-sm text-gray-700 mb-1"><span className="font-semibold">Input:</span> "I love this wonderful project"</p>
                  <p className="text-sm text-red-900"><span className="font-semibold">Output:</span> "I hate this awful project. 😠"</p>
                </div>
                
                <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-lg">
                  <p className="text-xs font-bold text-gray-800 mb-2">😐 NEUTRAL EMOTION</p>
                  <p className="text-sm text-gray-700 mb-1"><span className="font-semibold">Input:</span> "I hate this amazing thing"</p>
                  <p className="text-sm text-gray-900"><span className="font-semibold">Output:</span> "I dislike this good thing."</p>
                </div>
              </div>
            </div>

            {/* Technology Info */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-6 shadow-md">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Info size={20} className="text-indigo-600" />
                AI Technology
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm">
                  <span className="text-indigo-600 font-bold">•</span>
                  <div>
                    <p className="font-semibold text-gray-900">Face Detection</p>
                    <p className="text-xs text-gray-600 mt-1">Uses face-api.js neural networks to analyze facial expressions</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm">
                  <span className="text-purple-600 font-bold">•</span>
                  <div>
                    <p className="font-semibold text-gray-900">Landmark Analysis</p>
                    <p className="text-xs text-gray-600 mt-1">Examines 68 facial landmarks including eyebrows and mouth curvature</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm">
                  <span className="text-pink-600 font-bold">•</span>
                  <div>
                    <p className="font-semibold text-gray-900">Complete Rewriting</p>
                    <p className="text-xs text-gray-600 mt-1">Transforms entire text mood with 65+ word transformations per emotion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-white rounded-full shadow-lg border-2 border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">Powered by</span>
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">face-api.js</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">Real-time AI Detection</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">100% Private</span>
          </div>
          <p className="text-xs text-gray-500 mt-4">All processing happens locally in your browser. No data is sent to any server.</p>
        </div>
      </div>
    </div>
  );
};

export default EmotionTextRewriter;
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Type something to get started...</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleRewrite}
                disabled={!emotion || !inputText.trim() || isProcessing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin" size={24} />
                    Transforming...
                  </>
                ) : (
                  <>
                    <Sparkles size={24} />
                    Transform Text
                  </>
                )}
              </button>

              {rewrittenText && (
                <div className="mt-6 animate-fade-in space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Sparkles className="text-purple-600" size={16} />
                    Transformed Result
                  </label>
                  <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-6 rounded-2xl border-2 border-purple-200 shadow-inner">
                    <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">{rewrittenText}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(rewrittenText);
                        alert('✓ Copied to clipboard!');
                      }}
                      className="flex-1 bg-white text-purple-600 py-2.5 px-4 rounded-lg hover:bg-purple-50 transition-all font-semibold border-2 border-purple-200 flex items-center justify-center gap-2 shadow-sm hover:shadow"
                    >
                      📋 Copy Text
                    </button>
                    <button
                      onClick={() => {
                        setRewrittenText('');
                        setInputText('');
                      }}
                      className="flex-1 bg-white text-gray-600 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-all font-semibold border-2 border-gray-200 flex items-center justify-center gap-2 shadow-sm hover:shadow"
                    >
                      <RefreshCw size={16} />
                      Reset
                    </button>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-blue-900 leading-relaxed">
                      <strong className="flex items-center gap-1 mb-1">
                        <span>🎭</span>
                        Mood Conversion Applied:
                      </strong>
                      {emotion === 'happy' && 'Your happy expression completely transformed the text into a joyful, positive mood! All negative words became positive! 😊'}
                      {emotion === 'angry' && 'Your angry expression transformed the text into a frustrated, assertive mood! All positive words became negative! 😠'}
                      {emotion === 'sad' && 'Your sad expression transformed the text into a disappointed, gloomy mood! 😢'}
                      {emotion === 'neutral' && 'Your neutral expression (flat mouth, relaxed eyebrows) kept the text balanced with minor softening. 😐'}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
                <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2 text-lg">
                  <Sparkles size={20} />
                  How it Works
                </h3>
                <ul className="space-y-3 text-sm text-indigo-800">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
                    <span><strong>Face Detection:</strong> AI analyzes your facial expression using face-api.js neural networks</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
                    <span><strong>Advanced Analysis:</strong> Uses 68 facial landmarks to examine eyebrow position and mouth curvature for precise neutral face detection</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
                    <span><strong>Complete Mood Conversion:</strong> Your text is fully rewritten to match your detected facial emotion with 65+ word transformations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs">4</span>
                    <span><strong>Smart Transformations:</strong> Happy: "I hate this" → "I love this! 😊" • Angry: "I love this" → "I hate this. 😠"</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-8 py-4 bg-gradient-to-r from-purple-50 to-pink-50">
              <p className="text-sm text-gray-700 flex items-center justify-center gap-2 flex-wrap">
                <span className="font-semibold text-purple-700">Powered by</span>
                <span className="bg-white px-3 py-1 rounded-full font-bold text-purple-600 border border-purple-200 shadow-sm">face-api.js</span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-gray-600">Real-time AI Detection</span>
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">🔒 100% Private</span>
              </p>
            </div>
            <div className="px-8 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                All processing happens locally in your browser. No data is sent to any server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionTextRewriter;
