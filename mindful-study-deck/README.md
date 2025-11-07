# 🧠 Mindful Study Deck

An AI-powered flashcard application with webcam-based gesture controls, emotion detection, and adaptive learning algorithms. Study smarter with multimodal interactions and intelligent content adaptation.

## 🆓 **100% FREE AI-Powered Flashcard Generation!**

✨ Uses **Google Gemini API** with generous free tier:
- **60 requests/minute**
- **1,500 requests/day** 
- **1,000,000 tokens/day**
- **No credit card required!**

Get your free API key in 2 minutes: https://makersuite.google.com/app/apikey

## ✨ Features

### 📄 PDF Processing & AI Generation
- Drag-and-drop PDF upload
- Automatic text extraction using PDF.js
- AI-powered flashcard generation via **Google Gemini (FREE)**
- Multiple content modes: Detailed, Simple, and Encouraging

### 🖐️ Gesture Controls
- **Swipe Left/Right**: Navigate between cards
- **Thumbs Up**: Mark card as understood
- **Thumbs Down**: Mark card for review
- **Point (Index Finger)**: Draw on flashcards
- **Pinch**: Erase drawings
- **Open Palm**: Pan mode (no action)

### 😊 Emotion Detection
- Real-time facial expression analysis
- Detects: Happy, Angry, Neutral emotions
- Automatic content simplification when frustrated
- Frustration tracking (30-second window)

### 👁️ Blink Detection & Fatigue Monitoring
- Eye Aspect Ratio (EAR) based blink detection
- Tracks blinks per minute (normal: 15-20, tired: 25+)
- Automatic break suggestions after 2+ minutes of high blink rate
- Guided break exercises (breathing, eye movements, stretches)

### 🎨 Drawing & Annotations
- Canvas overlay on flashcards
- Gesture-based drawing with index finger
- Pinch to erase functionality
- Drawings saved with each card

### 🧮 Adaptive Learning (SM-2 Algorithm)
- Spaced repetition scheduling
- Difficulty tracking per card
- Smart card selection based on:
  - Current emotion state
  - Fatigue level (blink rate)
  - Card difficulty
  - Review schedule
- Avoids hard cards when user is tired or frustrated

### 📊 Session Analytics
- Real-time dashboard with study statistics
- Difficulty distribution visualization
- Accuracy tracking
- Session duration and activity metrics
- Gesture usage statistics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Webcam-enabled device
- Google Gemini API key (FREE - get it at https://makersuite.google.com/app/apikey)

### Installation

1. **Clone and navigate to the project**:
```bash
cd mindful-study-deck
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start the development server**:
```bash
npm run dev
```

4. **Open your browser**:
The app will automatically open at `http://localhost:3000`

### First-Time Setup

1. Grant webcam permissions when prompted
2. Get your FREE Gemini API key from https://makersuite.google.com/app/apikey
3. Upload a PDF file to generate flashcards
4. Start studying with gesture controls!

## 🎮 Usage Guide

### Basic Navigation

**Keyboard Shortcuts**:
- `←` or `P`: Previous card
- `→` or `N`: Next card
- `Space`: Flip card
- `U`: Mark as understood
- `R`: Mark for review
- `D`: Toggle dashboard

**Gesture Controls**:
- Open your palm and swipe left/right to navigate
- Show thumbs up/down to mark cards
- Point with index finger to draw
- Pinch thumb and index to erase

### Content Modes

The app automatically switches between three content modes based on your emotion:

1. **Detailed Mode** (📚): Full, comprehensive explanations
2. **Simple Mode** (📝): Simplified, beginner-friendly content
3. **Encouraging Mode** (💪): Motivational explanations with positive reinforcement

When frustration is detected, the app automatically switches to Simple or Encouraging mode.

### Break System

When your blink rate indicates fatigue:
1. A break suggestion modal appears
2. Choose from guided exercises:
   - Breathing exercises (1 min)
   - Eye movements (2 min)
   - Physical stretches (2 min)
3. Timer guides you through the break
4. Return refreshed to continue studying

## 🛠️ Technical Stack

- **Frontend**: React 18 with Hooks
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **ML Models**:
  - TensorFlow.js (@tensorflow/tfjs)
  - MediaPipe Hands (@mediapipe/hands)
  - MediaPipe Face Mesh (@mediapipe/face_mesh)
  - Hand Pose Detection (@tensorflow-models/hand-pose-detection)
  - Face Landmarks Detection (@tensorflow-models/face-landmarks-detection)
- **PDF Processing**: PDF.js (pdfjs-dist)
- **AI Generation**: Google Gemini API (FREE)

## 📁 Project Structure

```
mindful-study-deck/
├── src/
│   ├── components/
│   │   ├── PDFUpload.jsx          # PDF drop zone and processing
│   │   ├── Flashcard.jsx          # Card display with flip animation
│   │   ├── WebcamStream.jsx       # Webcam video feed
│   │   ├── GestureDetector.jsx    # Hand gesture recognition
│   │   ├── EmotionDetector.jsx    # Facial emotion analysis
│   │   ├── BlinkDetector.jsx      # Eye tracking for blinks
│   │   ├── DrawingCanvas.jsx      # Canvas overlay for drawing
│   │   ├── BreakModal.jsx         # Break suggestion modals
│   │   └── Dashboard.jsx          # Analytics dashboard
│   ├── hooks/
│   │   ├── useWebcam.js           # Webcam access hook
│   │   ├── useGestures.js         # Gesture detection logic
│   │   ├── useEmotions.js         # Emotion tracking logic
│   │   └── useBlinks.js           # Blink detection logic
│   ├── utils/
│   │   ├── pdfProcessor.js        # PDF text extraction
│   │   ├── flashcardGenerator.js  # OpenAI API integration
│   │   ├── spacedRepetition.js    # SM-2 algorithm
│   │   └── gestureRecognition.js  # Gesture calculation utilities
│   ├── App.jsx                    # Main application component
│   ├── main.jsx                   # React entry point
│   └── index.css                  # Global styles
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🔒 Privacy & Security

- **No data storage**: All data is kept in memory only (no localStorage/sessionStorage)
- **Client-side processing**: All ML models run in your browser
- **API key handling**: Gemini API key is used client-side only and never stored
- **Webcam privacy**: Video stream never leaves your device
- **FREE API**: Google Gemini offers free tier with generous limits

> ⚠️ **Production Note**: For production use, implement a backend proxy for API calls to protect your API key.

## 🎯 Future Enhancements

- [ ] Voice commands for hands-free control
- [ ] Multi-language support for flashcards
- [ ] Export/import flashcard decks
- [ ] Collaborative study sessions
- [ ] Mobile app version
- [ ] Gamification with achievements
- [ ] Study streak tracking
- [ ] Advanced analytics with ML insights

## 🐛 Troubleshooting

### Webcam not working
- Ensure you've granted camera permissions
- Check if another app is using the webcam
- Try refreshing the page

### Gestures not detected
- Ensure adequate lighting
- Keep your hand clearly visible to the webcam
- Maintain distance of 1-2 feet from camera
- Check that hand detector has initialized (green indicator)

### PDF processing fails
- Ensure the PDF contains extractable text (not scanned images)
- Check that your Gemini API key is valid (get free key at https://makersuite.google.com/app/apikey)
- Verify the PDF is not corrupted

### High memory usage
- Close other browser tabs
- Limit the size of PDFs (< 50 pages recommended)
- Restart the app if it becomes sluggish

## 📝 License

MIT License - feel free to use this project for learning and personal use.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 🙏 Acknowledgments

- Google for Gemini API (free and powerful!)
- TensorFlow.js and MediaPipe teams for ML models
- Mozilla PDF.js for PDF processing
- React and Vite communities

---

**Built with ❤️ for mindful, effective learning**

Happy studying! 🎓✨
