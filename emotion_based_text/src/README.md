# Emotion-Based Text Rewriter

A real-time emotion detection app that transforms text based on facial expressions using AI.

## 🚀 Features

- **Real Emotion Detection**: Uses face-api.js with neural networks to detect facial expressions
- **Smart Text Transformation**: Converts text tone based on detected emotions
- **Camera & Upload Support**: Capture live photos or upload existing images
- **Beautiful Modern UI**: Polished interface with Tailwind CSS

## 📦 Installation

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🎯 How It Works

1. **Capture Emotion**: Upload a photo or use your camera to capture your face
2. **AI Analysis**: face-api.js detects your emotion (happy, sad, angry, neutral)
3. **Enter Text**: Type any text you want to transform
4. **Transform**: The app rewrites your text to match the detected emotional tone

### Emotion Mappings

- **Happy Face** → Converts negative/angry text to positive tone
  - Example: "I hate this terrible problem" → "I dislike this challenging opportunity! 😊"
  
- **Angry/Sad Face** → Converts positive text to assertive/direct tone
  - Example: "This is amazing and wonderful" → "This is adequate and sufficient."

## 🐛 Troubleshooting

### Camera not working?
- Ensure you've granted camera permissions in your browser
- Check browser console (F12) for detailed error messages
- Try using HTTPS or localhost (required for camera access)
- Make sure no other app is using the camera

### No face detected?
- Ensure your face is clearly visible and well-lit
- Face the camera directly
- Try moving closer or adjusting lighting
- Check console logs for detection confidence scores

### Models not loading?
- Check your internet connection (models load from CDN)
- Wait a few seconds for models to download
- Check browser console for loading errors

### Text not transforming?
- Make sure a face was detected first (you'll see the emotion indicator)
- Enter text with emotional words (happy/angry keywords)
- Check that the emotion was successfully detected

## 🔍 Debug Mode

Open browser console (F12) to see detailed logs:
- Model loading status
- Image dimensions
- Detection results
- Emotion confidence scores
- Transformation logic

## 🛠️ Tech Stack

- **React** - UI framework
- **Vite** - Build tool
- **face-api.js** - Face detection and emotion recognition
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## 📝 Camera Capture Improvements

Recent fixes for camera capture:
- ✅ Added video ready state checking
- ✅ Improved canvas dimensions handling
- ✅ Better error messages and debugging
- ✅ Enhanced detection confidence thresholds
- ✅ Proper async/await flow for capture

## 🎨 UI Features

- Gradient backgrounds with smooth animations
- Real-time loading indicators
- Error messages with helpful suggestions
- Responsive design for mobile and desktop
- Hover effects and transitions
- Disabled states with visual feedback

## 📄 License

MIT
