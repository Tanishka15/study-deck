import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Smile, Frown, Sparkles, Zap, AlertCircle, Info, CheckCircle, Copy } from 'lucide-react';
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
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        setError('Failed to load emotion detection models');
      }
    };
    loadModels();
  }, []);

  const detectEmotion = async (imageData) => {
    if (!modelsLoaded) {
      setError('Models are still loading. Please wait...');
      return null;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const img = await faceapi.fetchImage(imageData);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.3
        }))
        .withFaceLandmarks()
        .withFaceExpressions();
      
      if (!detection) {
        setError('No face detected! Please ensure your face is clearly visible with good lighting.');
        setIsProcessing(false);
        setImage(null);
        return null;
      }

      console.log('Face detection score:', detection.detection.score);

      const landmarks = detection.landmarks;
      const expressions = detection.expressions;
      const mouth = landmarks.getMouth();
      
      const mouthCornerLeft = mouth[0];
      const mouthCornerRight = mouth[6];
      const mouthTop = mouth[3];
      const mouthBottom = mouth[9];
      
      const avgMouthCornerY = (mouthCornerLeft.y + mouthCornerRight.y) / 2;
      const mouthCenterY = (mouthTop.y + mouthBottom.y) / 2;
      const mouthCurvature = avgMouthCornerY - mouthCenterY;

      let maxEmotion = 'neutral';
      let maxValue = 0;
      
      for (const [emotion, value] of Object.entries(expressions)) {
        if (value > maxValue) {
          maxValue = value;
          maxEmotion = emotion;
        }
      }

      console.log('Detected emotion:', maxEmotion, 'with confidence:', maxValue);

      // Save confidence as percentage
      setConfidence(Math.round(maxValue * 100));

      const isMouthFlat = Math.abs(mouthCurvature) < 3;
      const lowEmotionConfidence = maxValue < 0.5;
      
      let detectedEmotion;
      
      if (isMouthFlat && lowEmotionConfidence && maxEmotion === 'neutral') {
        detectedEmotion = 'neutral';
      } else if (maxEmotion === 'neutral' && maxValue > 0.6) {
        detectedEmotion = 'neutral';
      } else {
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
      return detectedEmotion;
      setIsProcessing(false);
      return detectedEmotion;
    } catch (err) {
      setError(`Error: ${err.message}. Please try another image.`);
      setIsProcessing(false);
      setImage(null);
      return null;
    }
  };

  // AI-powered text rewriting using Hugging Face API
  const rewriteTextWithAI = async (text, detectedEmotion) => {
    if (!text.trim()) return '';

    console.log('AI Rewrite - Input:', text, 'Emotion:', detectedEmotion);

    // Define emotion-specific prompts
    const emotionPrompts = {
      happy: `Rewrite this to sound positive and joyful: "${text}"`,
      angry: `Rewrite this to sound angry and frustrated: "${text}"`,
      sad: `Rewrite this to sound sad and disappointed: "${text}"`,
      neutral: `Rewrite this to sound neutral and balanced: "${text}"`
    };

    const prompt = emotionPrompts[detectedEmotion] || emotionPrompts.neutral;

    try {
      console.log('Calling Hugging Face API...');
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout')), 5000)
      );
      
      // Create the fetch promise
      const fetchPromise = fetch(
        'https://api-inference.huggingface.co/models/gpt2',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 50,
              temperature: 0.8,
              top_p: 0.9,
              do_sample: true,
            }
          })
        }
      );

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        console.warn('API returned non-OK status:', response.status);
        throw new Error('AI model request failed');
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      let generatedText = result[0]?.generated_text || '';
      
      // If we got a result, clean it up
      if (generatedText) {
        // Remove the original prompt from the result
        generatedText = generatedText.replace(prompt, '').trim();
        
        // Get just the first sentence
        const sentences = generatedText.split(/[.!?]/);
        generatedText = sentences[0].trim();
        
        // Add emotion-specific emoji
        const emojiMap = {
          happy: ' 😊',
          angry: ' 😠',
          sad: ' 😢',
          neutral: ''
        };
        
        if (generatedText && !generatedText.match(/[.!?]$/)) {
          generatedText += '.';
        }
        
        const finalResult = generatedText + (emojiMap[detectedEmotion] || '');
        console.log('AI Success - Result:', finalResult);
        return finalResult;
      }
      
      throw new Error('Empty AI response');
      
    } catch (error) {
      console.error('AI rewrite error, using fallback:', error.message);
      
      // Fallback to rule-based system if AI fails
      return fallbackRewrite(text, detectedEmotion);
    }
  };

  // Fallback rule-based rewriting (used if AI fails)
  const fallbackRewrite = (text, detectedEmotion) => {
    let rewritten = text;

    if (detectedEmotion === 'happy') {
      const happyTransformations = [
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
        { from: /\bproblem\b/gi, to: "exciting opportunity" },
        { from: /\bissue\b/gi, to: "interesting challenge" },
        { from: /\bcan't\b/gi, to: "will definitely" },
        { from: /\bwon't\b/gi, to: "am excited to" },
        { from: /\bdislike\b/gi, to: "love" },
        { from: /\bdespise\b/gi, to: "adore" },
        { from: /\bnever\b/gi, to: "always" },
        { from: /\bdon't like\b/gi, to: "really enjoy" },
        { from: /\bdon't want\b/gi, to: "would love to" },
        { from: /\bdisgusting\b/gi, to: "delightful" },
        { from: /\bnasty\b/gi, to: "pleasant" },
        { from: /\bugly\b/gi, to: "beautiful" },
        { from: /\bpoor\b/gi, to: "excellent" },
        { from: /\bfail\b/gi, to: "succeed" },
        { from: /\bfailed\b/gi, to: "succeeded" },
        { from: /\bmiserable\b/gi, to: "cheerful" },
        { from: /\bdepressing\b/gi, to: "uplifting" },
        { from: /\bdifficult\b/gi, to: "easy" },
        { from: /\bhard\b/gi, to: "simple" },
      ];
      happyTransformations.forEach(({ from, to }) => {
        rewritten = rewritten.replace(from, to);
      });
      // Replace periods with exclamation marks for enthusiasm
      rewritten = rewritten.replace(/\./g, '!');
      rewritten = rewritten.replace(/!+/g, '!');
      if (!rewritten.match(/[!?]$/)) rewritten += '!';
      rewritten += ' 😊';
    } 
    else if (detectedEmotion === 'angry' || detectedEmotion === 'sad') {
      const negativeTransformations = [
        // Love and affection
        { from: /\babsolutely love\b/gi, to: "hate" },
        { from: /\bi love\b/gi, to: "I hate" },
        { from: /\blove this\b/gi, to: "hate this" },
        { from: /\blove it\b/gi, to: "hate it" },
        { from: /\blove that\b/gi, to: "hate that" },
        { from: /\badore\b/gi, to: "despise" },
        
        // Positive adjectives
        { from: /\bamazing\b/gi, to: "terrible" },
        { from: /\bwonderful\b/gi, to: "awful" },
        { from: /\bfantastic\b/gi, to: "horrible" },
        { from: /\bgreat\b/gi, to: "bad" },
        { from: /\bgood\b/gi, to: "poor" },
        { from: /\bbest\b/gi, to: "worst" },
        { from: /\bexcellent\b/gi, to: "terrible" },
        { from: /\bbeautiful\b/gi, to: "ugly" },
        { from: /\bdelightful\b/gi, to: "disgusting" },
        { from: /\bpleasant\b/gi, to: "nasty" },
        
        // Positive emotions
        { from: /\bhappy\b/gi, to: "miserable" },
        { from: /\bjoyful\b/gi, to: "sad" },
        { from: /\bexcited\b/gi, to: "angry" },
        { from: /\bthrilled\b/gi, to: "upset" },
        { from: /\bcheerful\b/gi, to: "depressed" },
        { from: /\boptimistic\b/gi, to: "disappointed" },
        { from: /\bmotivated\b/gi, to: "frustrated" },
        
        // Positive actions/states
        { from: /\bwill definitely\b/gi, to: "can't" },
        { from: /\bam excited to\b/gi, to: "won't" },
        { from: /\balways\b/gi, to: "never" },
        { from: /\breally enjoy\b/gi, to: "don't like" },
        { from: /\bwould love to\b/gi, to: "don't want to" },
        { from: /\bsucceed\b/gi, to: "fail" },
        { from: /\bsucceeded\b/gi, to: "failed" },
        
        // Positive descriptions
        { from: /\bexciting opportunity\b/gi, to: "problem" },
        { from: /\binteresting challenge\b/gi, to: "issue" },
        { from: /\buplifting\b/gi, to: "depressing" },
        { from: /\beasy\b/gi, to: "difficult" },
        { from: /\bsimple\b/gi, to: "hard" },
        { from: /\bnice\b/gi, to: "awful" },
      ];
      negativeTransformations.forEach(({ from, to }) => {
        rewritten = rewritten.replace(from, to);
      });
      // Replace exclamation marks with periods for seriousness
      rewritten = rewritten.replace(/!+/g, '.');
      if (!rewritten.match(/[.!?]$/)) rewritten += '.';
      rewritten += detectedEmotion === 'angry' ? ' 😠' : ' 😢';
    }
    else if (detectedEmotion === 'neutral') {
      if (!rewritten.match(/[.!?]$/)) rewritten += '.';
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
    console.log('START CAMERA CLICKED');
    setError(null);
    setCameraLoading(true);
    setUseCamera(true);
    setCameraReady(false);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      console.log('Got stream:', stream);
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log('Attaching stream to video element...');
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Metadata loaded');
          videoRef.current.play().then(() => {
            console.log('Video playing!', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            setCameraLoading(false);
            setTimeout(() => {
              setCameraReady(true);
              console.log('Camera ready for capture');
            }, 500);
          }).catch(e => {
            console.error('Play failed:', e);
            setError('Failed to start video playback');
            setUseCamera(false);
            setCameraLoading(false);
            setCameraReady(false);
          });
        };
      } else {
        console.error('videoRef.current is null!');
        throw new Error('Video element not found');
      }
    } catch (err) {
      console.error('Camera error:', err);
      let errorMessage = 'Failed to access camera. ';
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found.';
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Camera is in use by another app.';
      } else {
        errorMessage += err.message;
      }
      setError(errorMessage);
      setUseCamera(false);
      setCameraLoading(false);
      setCameraReady(false);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setUseCamera(false);
    setCameraLoading(false);
    setCameraReady(false);
  };

  const captureImage = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setError('Camera not ready.');
      return;
    }
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setError('Camera still loading. Wait a moment.');
      return;
    }
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    if (canvas.width === 0 || canvas.height === 0) {
      setError('Camera feed not ready.');
      return;
    }
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    stopCamera();
    setImage(imageData);
    await detectEmotion(imageData);
  };

  const handleRewrite = async () => {
    if (emotion && inputText) {
      setIsTransforming(true);
      setShowSparkle(true);
      setCopied(false); // Reset copy state
      setError(null);
      
      try {
        console.log('Starting text transformation with emotion:', emotion);
        // Call AI model to rewrite text
        const rewritten = await rewriteTextWithAI(inputText, emotion);
        console.log('Transformation complete:', rewritten);
        
        if (rewritten && rewritten.trim()) {
          setRewrittenText(rewritten);
        } else {
          throw new Error('Empty result from AI');
        }
        
        setIsTransforming(false);
        
        // Hide sparkle after animation
        setTimeout(() => setShowSparkle(false), 1000);
      } catch (err) {
        console.error('Error rewriting text:', err);
        
        // Immediately use fallback if AI fails
        console.log('Using fallback rewrite method');
        const fallbackResult = fallbackRewrite(inputText, emotion);
        setRewrittenText(fallbackResult);
        
        setIsTransforming(false);
        setShowSparkle(false);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rewrittenText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated background pattern - SUPER VIBRANT COLORS */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[700px] h-[700px] bg-purple-400 rounded-full filter blur-3xl animate-blob opacity-70"></div>
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-orange-400 rounded-full filter blur-3xl animate-blob animation-delay-2000 opacity-70"></div>
        <div className="absolute bottom-0 left-1/3 w-[700px] h-[700px] bg-pink-400 rounded-full filter blur-3xl animate-blob animation-delay-4000 opacity-70"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-400 rounded-full filter blur-3xl animate-blob animation-delay-2000 opacity-60"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-indigo-400 rounded-full filter blur-3xl animate-blob animation-delay-4000 opacity-60"></div>
      </div>
      
      {/* Header with vibrant gradient background */}
      <div className="bg-gradient-to-r from-indigo-800 via-fuchsia-700 to-rose-700 border-b-[3px] border-white/20 sticky top-0 z-50 shadow-[0_10px_40px_rgba(99,102,241,0.4)] backdrop-blur-md relative overflow-hidden">
  {/* Subtle animated light streak */}
  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[gradientShift_8s_ease-in-out_infinite]"></div>

  <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-6 relative z-10">
    <div className="flex flex-wrap items-center justify-between gap-6">

      {/* Left side: Icon + Title */}
      <div className="flex items-center gap-5">
        {/* Glowing icon container */}
       

        <div>
          {/* 🩵 Text fixed for visibility */}
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)]">
            Emotion Text Rewriter
          </h1>
          <p className="text-sm md:text-base text-white/90 mt-1 font-medium tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
            ✨ AI-powered emotion detection • ⚡ AI text generation (Hugging Face GPT-2)
          </p>
        </div>
      </div>

      {/* Right side: Status Badge */}
      {modelsLoaded ? (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-100 to-green-50 text-emerald-700 rounded-full text-sm shadow-md font-bold border border-green-200 hover:shadow-lg hover:scale-[1.03] transition-all">
          <CheckCircle size={18} className="text-emerald-600 animate-pulse" />
          <span>AI Ready</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 rounded-full text-sm shadow-md font-bold border border-indigo-200 animate-pulse">
          <div className="animate-spin rounded-full h-5 w-5 border-[3px] border-indigo-600 border-t"></div>
          <span>Loading AI...</span>
        </div>
      )}
    </div>
  </div>
</div>


      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-8 lg:px-12 relative">
        {/* Info Banner */}
        <div className="mb-6 glass rounded-2xl p-5 shadow-xl border-2 border-white/50 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg flex-shrink-0 transform transition-transform hover:rotate-12 duration-300">
              <Info size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-gray-900 mb-4 text-xl tracking-tight flex items-center gap-2">
                 <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text">How it works</span>
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                {/* Step 1 */}
                <div className="group relative bg-gradient-to-br from-indigo-50 to-blue-50 backdrop-blur rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border border-indigo-200 overflow-hidden">
                  {/* Animated background circle */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-300/30 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <div className="relative flex flex-col items-center text-center">
                    {/* Number badge */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mb-3 shadow-md group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                      <span className="font-black text-white text-xl">1</span>
                    </div>
                    <div className="w-10 h-0.5 bg-gradient-to-r from-indigo-400 to-transparent mb-2 rounded-full"></div>
                    <p className="font-bold text-gray-900 text-base mb-1">Capture Emotion</p>
                    <p className="text-gray-700 text-xs leading-relaxed">Upload photo or use camera</p>
                    {/* Icon */}
                    <div className="mt-2 text-2xl group-hover:scale-125 transition-transform duration-300">📸</div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 backdrop-blur rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border border-purple-200 overflow-hidden">
                  {/* Animated background circle */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-300/30 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <div className="relative flex flex-col items-center text-center">
                    {/* Number badge */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-3 shadow-md group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                      <span className="font-black text-white text-xl">2</span>
                    </div>
                    <div className="w-10 h-0.5 bg-gradient-to-r from-purple-400 to-transparent mb-2 rounded-full"></div>
                    <p className="font-bold text-gray-900 text-base mb-1">AI Detection</p>
                    <p className="text-gray-700 text-xs leading-relaxed">Analyzes facial expression</p>
                    {/* Icon */}
                    <div className="mt-2 text-2xl group-hover:scale-125 transition-transform duration-300">🤖</div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="group relative bg-gradient-to-br from-pink-50 to-rose-50 backdrop-blur rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border border-pink-200 overflow-hidden">
                  {/* Animated background circle */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-300/30 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <div className="relative flex flex-col items-center text-center">
                    {/* Number badge */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-3 shadow-md group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                      <span className="font-black text-white text-xl">3</span>
                    </div>
                    <div className="w-10 h-0.5 bg-gradient-to-r from-pink-400 to-transparent mb-2 rounded-full"></div>
                    <p className="font-bold text-gray-900 text-base mb-1">Transform Text</p>
                    <p className="text-gray-700 text-xs leading-relaxed">Match detected emotion</p>
                    {/* Icon */}
                    <div className="mt-2 text-2xl group-hover:scale-125 transition-transform duration-300">✨</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-xl border-2 border-transparent bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
              
              <div className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 px-5 py-4 relative overflow-hidden shadow-md">
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <div className="flex items-center gap-3 text-white relative z-10">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                    <Camera size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Step 1: Capture Emotion</h2>
                    <p className="text-blue-100 text-xs font-medium">Upload or use camera</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {error && (
                  <div className="mb-5 p-5 glass-dark border-l-4 border-red-500 rounded-2xl flex items-start gap-4 animate-fade-in shadow-lg">
                    <div className="p-2 bg-red-500 rounded-full flex-shrink-0">
                      <AlertCircle className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="text-red-900 font-bold mb-1">Error Detected</p>
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {!useCamera && !image && (
                  <div className="space-y-6">
                    <label className="block group cursor-pointer">
                      <div className="relative border-4 border-dashed border-gray-300 rounded-3xl p-20 text-center hover:border-indigo-500 bg-gradient-to-br from-gray-50 to-white hover:from-indigo-50 hover:via-purple-50 hover:to-pink-50 transition-all duration-500 hover:scale-[1.02] shadow-lg hover:shadow-2xl overflow-hidden">
                        {/* Animated background circles */}
                        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-200 rounded-full mix-blend-multiply filter blur-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-500 -translate-x-16 -translate-y-16"></div>
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-500 translate-x-16 translate-y-16"></div>
                        
                        <div className="relative">
                          <div className="mb-5 inline-flex p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-xl">
                            <Upload className="text-white" size={48} />
                          </div>
                          <p className="text-gray-900 font-extrabold text-2xl mb-3 tracking-tight">Upload an Image</p>
                          <p className="text-gray-600 font-semibold mb-2">PNG, JPG up to 10MB</p>
                          <div className="inline-flex items-center gap-2 text-sm text-gray-500 mt-4 bg-white/70 backdrop-blur px-4 py-2 rounded-full">
                            <CheckCircle size={16} className="text-green-600" />
                            <span>Best results with clear, well-lit photos</span>
                          </div>
                        </div>
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
                        <div className="w-full border-t-2 border-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-6 py-2 bg-white text-gray-600 font-bold text-sm rounded-full shadow-md">or</span>
                      </div>
                    </div>

                   <button
  onClick={startCamera}
  disabled={!modelsLoaded || cameraLoading}
  className="group relative w-fit mx-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 
  text-white py-7 px-10 rounded-2xl 
  hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 
  transition-all duration-500 
  flex items-center justify-center gap-3 font-bold text-lg 
  shadow-2xl hover:shadow-purple-500/50 hover:scale-[1.05] active:scale-[0.98] 
  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
>
  {/* Shine effect */}
  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
  -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-2xl"></div>

  {/* Button Content */}
  <div className="relative flex items-center gap-3 px-2">
    {cameraLoading ? (
      <>
        <div className="animate-spin rounded-full h-7 w-7 border-3 border-white border-t-transparent"></div>
        <span className="tracking-wide">Starting Camera...</span>
      </>
    ) : (
      <>
        <Camera size={24} className="group-hover:scale-110 transition-transform duration-300" />
        <span className="tracking-wide">Use Camera</span>
      </>
    )}
  </div>
</button>


                      <div className="glass border border-blue-200/60 rounded-xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-300">
                      <p className="text-sm font-extrabold text-blue-900 mb-4 flex items-center gap-3">
                        <span className="text-2xl">📸</span> 
                        <h4 className="text-sm sm:text-base font-extrabold text-blue-900 tracking-wide">
                          Tips for Best Results
                        </h4>
                      </p>
                    <div className="flex justify-center">
  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-blue-800 w-[85%] sm:w-[70%]">
    <div className="flex items-center gap-2.5 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
      <CheckCircle size={14} className="text-blue-600 flex-shrink-0" />
      <span className="font-semibold truncate">Well-lit face</span>
    </div>
    <div className="flex items-center gap-2.5 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
      <CheckCircle size={14} className="text-blue-600 flex-shrink-0" />
      <span className="font-semibold truncate">Look at camera</span>
    </div>
    <div className="flex items-center gap-2.5 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
      <CheckCircle size={14} className="text-blue-600 flex-shrink-0" />
      <span className="font-semibold truncate">Clear expression</span>
    </div>
    <div className="flex items-center gap-2.5 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
      <CheckCircle size={14} className="text-blue-600 flex-shrink-0" />
      <span className="font-semibold truncate">No shadows</span>
    </div>
  </div>
</div>
                      </div>
                    </div>
                )}

                {useCamera && (
                  <div className="space-y-5">
                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-xl ring-4 ring-indigo-500/50 transform transition-all max-w-xl mx-auto" style={{ minHeight: '500px', maxHeight: '700px' }}>
                      {/* Recording indicator */}
                      {cameraReady && (
                        <div className="absolute top-6 left-6 z-10 flex items-center gap-3 glass-dark px-4 py-2.5 rounded-full">
                          <div className="relative">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-recording"></div>
                            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                          </div>
                          <span className="text-white text-sm font-bold tracking-wide">LIVE</span>
                        </div>
                      )}
                      
                      {/* Camera guidelines overlay */}
                      {cameraReady && (
                        <div className="absolute inset-0 pointer-events-none">
                          {/* Face detection frame */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-4 border-indigo-400/50 rounded-3xl">
                            {/* Corner accents */}
                            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-2xl"></div>
                            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-2xl"></div>
                            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-2xl"></div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-2xl"></div>
                          </div>
                          
                          {/* Instruction text */}
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 glass-dark px-6 py-3 rounded-full">
                       
                          </div>
                        </div>
                      )}
                      
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      
                      {!cameraReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/95 via-indigo-900/95 to-purple-900/95 backdrop-blur-lg">
                          <div className="text-center text-white">
                            <div className="relative inline-block mb-6">
                              <div className="animate-spin rounded-full h-24 w-24 border-6 border-white/20 border-t-white"></div>
                              <Camera className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" size={40} />
                            </div>
                            <p className="text-2xl font-extrabold mb-3 tracking-tight">Initializing Camera...</p>
                            <p className="text-sm text-indigo-200 font-medium">Allow camera access when prompted</p>
                            <div className="flex items-center justify-center gap-2 mt-5">
                              <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-2000"></div>
                              <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-4000"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={captureImage}
                        disabled={!cameraReady}
                        className="group relative bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 text-white py-5 rounded-xl hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 transition-all font-bold shadow-2xl hover:shadow-green-500/50 hover:scale-[1.05] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden text-lg"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <Camera size={24} className="relative group-hover:scale-110 transition-transform" />
                        <span className="relative">Capture Photo</span>
                      </button>
                      <button
                        onClick={stopCamera}
                        className="group bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 text-white py-5 rounded-2xl hover:from-gray-700 hover:via-gray-800 hover:to-gray-900 transition-all font-bold shadow-2xl hover:shadow-gray-500/50 hover:scale-[1.05] flex items-center justify-center gap-3 text-lg"
                      >
                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                )}

                {image && !useCamera && (
                  <div className="space-y-5">
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/50 max-w-sm mx-auto">
                      <img src={image} alt="Captured" className="w-full h-auto object-cover max-h-80" />
                      {emotion && (
                        <div className="absolute top-4 right-4">
                          <div className={`px-4 py-2 rounded-full font-bold text-sm shadow-xl backdrop-blur-sm animate-fade-in ${
                            emotion === 'happy' ? 'bg-green-500/90 text-white' 
                            : emotion === 'angry' ? 'bg-red-500/90 text-white'
                            : emotion === 'sad' ? 'bg-blue-500/90 text-white'
                            : 'bg-gray-500/90 text-white'
                          }`}>
                            {emotion === 'happy' && '😊 Happy'}
                            {emotion === 'angry' && '😠 Angry'}
                            {emotion === 'sad' && '😢 Sad'}
                            {emotion === 'neutral' && '😐 Neutral'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {emotion && (
                      <div className={`relative p-8 rounded-3xl text-center shadow-2xl transform transition-all hover:scale-[1.02] animate-fade-in border-4 ${
                        emotion === 'happy' ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-400 hover:shadow-green-500/50' 
                        : emotion === 'angry' ? 'bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 border-red-400 hover:shadow-red-500/50'
                        : emotion === 'sad' ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-400 hover:shadow-blue-500/50'
                        : 'bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50 border-gray-400 hover:shadow-gray-500/50'
                      }`}>
                        {/* Animated emoji */}
                        <div className="mb-4 relative inline-block">
                          <div className={`absolute inset-0 rounded-full blur-xl opacity-50 ${
                            emotion === 'happy' ? 'bg-green-400 animate-pulse' 
                            : emotion === 'angry' ? 'bg-red-400 animate-pulse'
                            : emotion === 'sad' ? 'bg-blue-400 animate-pulse'
                            : 'bg-gray-400 animate-pulse'
                          }`}></div>
                          {emotion === 'happy' && <Smile className="relative mx-auto text-green-600 animate-bounce" size={72} />}
                          {emotion === 'angry' && <Frown className="relative mx-auto text-red-600 animate-bounce" size={72} />}
                          {emotion === 'sad' && <Frown className="relative mx-auto text-blue-600 animate-bounce" size={72} />}
                          {emotion === 'neutral' && <div className="relative text-7xl animate-bounce">😐</div>}
                        </div>
                        
                        <div className={`inline-block px-6 py-3 rounded-full mb-3 font-extrabold text-4xl capitalize shadow-lg ${
                          emotion === 'happy' ? 'bg-green-500 text-white' 
                          : emotion === 'angry' ? 'bg-red-500 text-white'
                          : emotion === 'sad' ? 'bg-blue-500 text-white'
                          : 'bg-gray-500 text-white'
                        }`}>
                          {emotion}
                        </div>
                        
                        <p className="text-sm font-bold text-gray-700 flex items-center justify-center gap-2 mt-3">
                          <CheckCircle size={18} className="text-green-600 animate-pulse" />
                          Emotion Detected Successfully
                        </p>
                        
                        {/* Confidence indicator with elegant gradient background */}
                        <div className="mt-6 p-5 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 backdrop-blur rounded-xl border border-white/60 shadow-lg">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <Zap size={18} className="text-amber-500 animate-pulse" />
                            <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text">AI Confidence Level</span>
                          </div>
                          <div className="relative w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-full h-5 overflow-hidden shadow-inner border border-gray-300/50">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                                emotion === 'happy' ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500' 
                                : emotion === 'angry' ? 'bg-gradient-to-r from-rose-400 via-red-500 to-pink-500'
                                : emotion === 'sad' ? 'bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500'
                                : 'bg-gradient-to-r from-slate-400 via-gray-500 to-zinc-500'
                              }`} 
                              style={{width: `${confidence}%`, transition: 'width 1.5s ease-out'}}
                            >
                              {/* Shimmer effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"></div>
                            </div>
                          </div>
                          <div className="flex justify-between mt-3 text-xs font-bold">
                            <span className="text-gray-500">0%</span>
                            <span className={`text-base font-extrabold ${
                              emotion === 'happy' ? 'text-green-600' 
                              : emotion === 'angry' ? 'text-red-600'
                              : emotion === 'sad' ? 'text-blue-600'
                              : 'text-gray-600'
                            }`}>{confidence}% Match ✨</span>
                            <span className="text-gray-500">100%</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        setImage(null);
                        setEmotion(null);
                        setRewrittenText('');
                        setError(null);
                      }}
                      className="group w-full bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 text-white py-5 rounded-2xl hover:from-gray-700 hover:via-gray-800 hover:to-gray-900 transition-all flex items-center justify-center gap-3 font-bold shadow-xl hover:shadow-2xl hover:scale-[1.03] text-lg"
                    >
                      <RefreshCw size={22} className="group-hover:rotate-180 transition-transform duration-500" />
                      Try Another Photo
                    </button>
                  </div>
                )}

                {isProcessing && (
                  <div className="text-center py-20 animate-fade-in">
                    <div className="relative inline-block mb-8">
                      {/* Outer pulsing ring */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-pulse-glow"></div>
                      
                      {/* Middle spinning ring */}
                      <div className="relative animate-spin rounded-full h-28 w-28 border-8 border-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-padding">
                        <div className="absolute inset-2 rounded-full bg-white"></div>
                      </div>
                      
                      {/* Center icon */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <Sparkles className="text-indigo-600 animate-sparkle" size={40} />
                      </div>
                      
                      {/* Orbiting particles */}
                      <div className="absolute top-0 left-1/2 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                      <div className="absolute bottom-0 right-1/2 w-3 h-3 bg-pink-400 rounded-full animate-ping animation-delay-2000"></div>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-gray-900 font-extrabold text-2xl tracking-tight">
                        🔍 Analyzing Emotion...
                      </p>
                      <p className="text-gray-600 font-medium text-lg">Using AI to detect facial expressions</p>
                      
                      {/* Progress dots */}
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce animation-delay-2000"></div>
                        <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce animation-delay-4000"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-xl border-2 border-transparent bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
              
              <div className="bg-gradient-to-r from-purple-500 via-pink-600 to-rose-600 px-5 py-4 relative overflow-hidden shadow-md">
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <div className="flex items-center gap-3 text-white relative z-10">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Step 2: Transform Text</h2>
                    <p className="text-pink-100 text-xs font-medium">Match your emotion</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Zap size={16} className="text-purple-600" />
                    Enter Your Text
                  </label>
                  <div className="relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type your text here... AI will transform it to match your emotion! ✨"
                      className="w-full h-40 p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent focus:outline-none resize-none transition-all text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500 text-sm leading-relaxed shadow-sm disabled:shadow-none bg-white"
                      disabled={!emotion}
                    />
                    {emotion && inputText && (
                      <div className="absolute bottom-3 right-3">
                        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-md backdrop-blur ${
                          emotion === 'happy' ? 'bg-green-500/90 text-white' 
                          : emotion === 'angry' ? 'bg-red-500/90 text-white'
                          : emotion === 'sad' ? 'bg-blue-500/90 text-white'
                          : 'bg-gray-500/90 text-white'
                        }`}>
                          {emotion === 'happy' && '😊 Happy'}
                          {emotion === 'angry' && '😠 Angry'}
                          {emotion === 'sad' && '😢 Sad'}
                          {emotion === 'neutral' && '😐 Neutral'}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 px-1">
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      {!emotion ? (
                        <>
                          <AlertCircle size={16} className="text-orange-500" />
                          <span className="text-orange-600">Capture your emotion first</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} className="text-green-600" />
                          <span className="text-green-600">Ready to transform!</span>
                        </>
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-500 font-mono bg-gradient-to-r from-gray-100 to-gray-200 px-3 py-1.5 rounded-full font-bold">
                        {inputText.length} chars
                      </p>
                    </div>
                  </div>
                </div>

                <button
  onClick={handleRewrite}
  disabled={!emotion || !inputText.trim() || isTransforming}
  className="group relative w-fit mx-auto bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 
  text-white py-7 px-10 rounded-2xl 
  hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 
  transition-all duration-500 
  disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed 
  font-bold text-lg shadow-[0_0_40px_rgba(168,85,247,0.6)] 
  hover:shadow-[0_0_60px_rgba(236,72,153,0.8)] hover:scale-[1.05] active:scale-[0.98] 
  flex items-center justify-center gap-3 overflow-visible
  border-4 border-white/30"
>
  {/* Floating sparkles on hover */}
  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl pointer-events-none opacity-0 group-hover:opacity-100 group-hover:animate-[sparkleHover_2s_ease-in-out_infinite]">
    ✨
  </span>
  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-3xl pointer-events-none opacity-0 group-hover:opacity-100 group-hover:animate-[sparkleHover_2s_ease-in-out_infinite] animation-delay-1000">
    ✨
  </span>

  {/* Animated rainbow gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 via-purple-600 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl animate-[gradientShift_3s_ease-in-out_infinite]"></div>

  {/* Sparkle effect */}
  {showSparkle && (
    <div className="absolute inset-0 flex items-center justify-center">
      <Sparkles className="animate-sparkle text-yellow-300" size={80} />
    </div>
  )}

  {/* Inner content */}
  <div className="relative flex items-center gap-3 px-2">
    {isTransforming ? (
      <>
        <div className="animate-spin rounded-full h-7 w-7 border-3 border-white border-t-transparent"></div>
        <span>✨ Transforming Magic...</span>
      </>
    ) : (
      <>
        <Sparkles size={24} className="group-hover:rotate-12 transition-transform duration-300" />
        <span className="tracking-wide">Transform Text Now</span>
        <Zap size={22} className="group-hover:scale-125 transition-transform duration-300" />
      </>
    )}
  </div>
</button>

                {rewrittenText && (
                  <div className="space-y-5 animate-fade-in relative">
                    {/* Celebration particles */}
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 pointer-events-none">
                     
                    </div>
                    
                    <label className="block text-sm font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent flex items-center gap-2 mb-2 animate-pulse">
                      <Sparkles size={18} className="text-purple-600" />
                      ✨ Transformed Result ✨
                    </label>
                    <div className="relative bg-gradient-to-br from-emerald-50 via-cyan-50 to-purple-50 rounded-2xl p-7 border-[6px] border-transparent bg-clip-padding shadow-[0_0_50px_rgba(16,185,129,0.5)] hover:shadow-[0_0_70px_rgba(236,72,153,0.6)] transition-all duration-300 transform hover:scale-[1.02] overflow-hidden"
                      style={{
                        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #10b981, #06b6d4, #a855f7, #ec4899, #f59e0b)',
                        backgroundOrigin: 'border-box',
                        backgroundClip: 'padding-box, border-box'
                      }}>
                      {/* Colorful gradient overlays */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-100/30 via-cyan-100/30 via-purple-100/30 to-pink-100/30 pointer-events-none"></div>
                      {/* Shimmer overlay with rainbow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rainbow to-transparent -translate-x-full animate-shimmer" style={{animationDuration: '2s', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5) 30%, rgba(168,85,247,0.4) 50%, rgba(255,255,255,0.5) 70%, transparent)'}}></div>
                      
                      <p className="relative text-gray-900 text-lg leading-relaxed whitespace-pre-wrap font-semibold mb-4 drop-shadow">{rewrittenText}</p>
                      
                      {/* Copy button with rainbow gradient */}
                      <button
                        onClick={copyToClipboard}
                        className="relative group flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white rounded-xl hover:from-indigo-600 hover:via-purple-700 hover:to-pink-700 transition-all font-bold text-sm shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(236,72,153,0.7)] transform hover:scale-110 border-2 border-white/50"
                      >
                        {copied ? (
                          <>
                            <CheckCircle size={16} className="animate-bounce" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="glass p-6 rounded-xl border-2 border-blue-300 shadow-lg transform hover:scale-[1.01] transition-transform">
                      <p className="text-sm text-blue-900 font-medium">
                        <strong className="flex items-center gap-2 mb-3 text-base">
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

            {/* Gradient Divider */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full my-8"></div>

            {/* AI Model Info */}
            <div className="glass rounded-3xl border-2 border-indigo-300 p-7 shadow-2xl transform transition-all hover:scale-[1.01] bg-gradient-to-br from-indigo-50 to-purple-50">
              <h3 className="font-extrabold text-gray-900 mb-5 flex items-center gap-3 text-xl tracking-tight">
                <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl">
                  <Zap size={24} className="text-white" />
                </div>
                AI-Powered Text Generation
              </h3>
              <div className="space-y-4 text-sm text-gray-700">
                <div className="flex items-start gap-4 bg-white/70 backdrop-blur rounded-xl p-4 shadow-md transform transition-all hover:scale-[1.02] hover:shadow-lg">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex-shrink-0">
                    <span className="text-white font-bold text-lg">🤖</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base mb-1">Hugging Face GPT-2 Model</p>
                    <p className="text-xs text-gray-600">Uses advanced AI language model to naturally rewrite your text based on detected emotion</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 bg-white/70 backdrop-blur rounded-xl p-4 shadow-md transform transition-all hover:scale-[1.02] hover:shadow-lg">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex-shrink-0">
                    <span className="text-white font-bold text-lg">⚡</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base mb-1">Smart Fallback System</p>
                    <p className="text-xs text-gray-600">Automatically switches to rule-based transformation if AI model is unavailable</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 bg-white/70 backdrop-blur rounded-xl p-4 shadow-md transform transition-all hover:scale-[1.02] hover:shadow-lg">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex-shrink-0">
                    <span className="text-white font-bold text-lg">🎯</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base mb-1">Context-Aware Processing</p>
                    <p className="text-xs text-gray-600">AI understands context and rewrites entire sentences naturally, not just word replacements</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gradient Divider */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-pink-500 to-transparent rounded-full my-8"></div>

            {/* Examples Section */}
<div className="glass rounded-3xl border border-white/40 p-8 shadow-2xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(168,85,247,0.25)] hover:scale-[1.01]">
  <h3 className="font-extrabold text-gray-900 mb-8 flex items-center gap-3 text-2xl tracking-tight">
    <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-md">
      <Sparkles size={24} className="text-white" />
    </div>
    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text">
      Transformation Examples
    </span>
  </h3>

  <div className="grid md:grid-cols-3 gap-6">
    {/* Happy Example */}
    <div className="group relative bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 border-2 border-green-400 rounded-2xl p-6 shadow-lg hover:shadow-green-400/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-300/20 via-transparent to-emerald-400/10 opacity-70 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">😊</span>
          <p className="text-sm font-extrabold text-green-800 tracking-wide uppercase">Happy Emotion</p>
        </div>
        <div className="space-y-2 bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-inner">
          <p className="text-sm text-gray-700">
            <span className="font-bold text-gray-900">Input:</span> <span className="italic">"I hate this terrible day"</span>
          </p>
          <div className="h-[2px] bg-gradient-to-r from-green-400 to-transparent rounded-full"></div>
          <p className="text-sm text-green-900 font-medium">
            <span className="font-bold">Output:</span> "I absolutely love this amazing day! 😊"
          </p>
        </div>
      </div>
    </div>

    {/* Angry Example */}
    <div className="group relative bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 border-2 border-red-400 rounded-2xl p-6 shadow-lg hover:shadow-red-400/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-300/20 via-transparent to-orange-400/10 opacity-70 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">😠</span>
          <p className="text-sm font-extrabold text-red-800 tracking-wide uppercase">Angry Emotion</p>
        </div>
        <div className="space-y-2 bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-inner">
          <p className="text-sm text-gray-700">
            <span className="font-bold text-gray-900">Input:</span> <span className="italic">"I love this wonderful project"</span>
          </p>
          <div className="h-[2px] bg-gradient-to-r from-red-400 to-transparent rounded-full"></div>
          <p className="text-sm text-red-900 font-medium">
            <span className="font-bold">Output:</span> "I hate this awful project. 😠"
          </p>
        </div>
      </div>
    </div>

    {/* Neutral Example */}
    <div className="group relative bg-gradient-to-br from-slate-100 via-gray-50 to-zinc-100 border-2 border-gray-400 rounded-2xl p-6 shadow-lg hover:shadow-gray-400/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-300/20 via-transparent to-gray-400/10 opacity-70 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">😐</span>
          <p className="text-sm font-extrabold text-gray-800 tracking-wide uppercase">Neutral Emotion</p>
        </div>
        <div className="space-y-2 bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-inner">
          <p className="text-sm text-gray-700">
            <span className="font-bold text-gray-900">Input:</span> <span className="italic">"I hate this amazing thing"</span>
          </p>
          <div className="h-[2px] bg-gradient-to-r from-gray-400 to-transparent rounded-full"></div>
          <p className="text-sm text-gray-900 font-medium">
            <span className="font-bold">Output:</span> "I dislike this good thing."
          </p>
        </div>
      </div>
    </div>
  </div>
</div>


            {/* Gradient Divider */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full my-8"></div>

            {/* Technology Info */}
            <div className="glass rounded-3xl border-2 border-indigo-300 p-7 shadow-2xl transform transition-all hover:scale-[1.01]">
              <h3 className="font-extrabold text-gray-900 mb-5 flex items-center gap-3 text-xl tracking-tight">
                <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl">
                  <Info size={24} className="text-white" />
                </div>
                AI Technology
              </h3>
              <div className="space-y-4 text-sm text-gray-700">
                <div className="flex items-start gap-4 bg-white/70 backdrop-blur rounded-xl p-4 shadow-md transform transition-all hover:scale-[1.02] hover:shadow-lg">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex-shrink-0">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base mb-1">Face Detection</p>
                    <p className="text-xs text-gray-600">Uses face-api.js neural networks to analyze facial expressions</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 bg-white/70 backdrop-blur rounded-xl p-4 shadow-md transform transition-all hover:scale-[1.02] hover:shadow-lg">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex-shrink-0">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base mb-1">Landmark Analysis</p>
                    <p className="text-xs text-gray-600">Examines 68 facial landmarks including eyebrows and mouth curvature</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 bg-white/70 backdrop-blur rounded-xl p-4 shadow-md transform transition-all hover:scale-[1.02] hover:shadow-lg">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex-shrink-0">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base mb-1">Complete Rewriting</p>
                    <p className="text-xs text-gray-600">Transforms entire text mood with 65+ word transformations per emotion</p>
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
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">face-api.js</span>
            <span className="text-gray-400">•</span>
       
            <span className="text-sm text-gray">100% Private</span>
          </div>
          <p className="text-xs text-gray-500 mt-4">All processing happens locally in your browser. No data is sent to any server.</p>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default EmotionTextRewriter;
