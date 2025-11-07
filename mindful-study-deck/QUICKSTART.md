# 🚀 Quick Start Guide - Mindful Study Deck

Get up and running in 5 minutes!

## Step 1: Install Dependencies (2 min)

```bash
cd mindful-study-deck
npm install
```

This installs:
- React and React DOM
- TensorFlow.js and ML models
- PDF.js for PDF processing
- OpenAI SDK
- Tailwind CSS
- Vite build tool

## Step 2: Start Development Server (30 sec)

```bash
npm run dev
```

The app will automatically open at `http://localhost:3000`

## Step 3: Grant Webcam Permissions (30 sec)

When prompted by your browser:
1. Click "Allow" to grant webcam access
2. The webcam feed should appear in the bottom-right corner
3. Look for green status indicators on the ML detection panels

## Step 4: Get Google Gemini API Key (1 min) - FREE!

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key

> 💡 **Tip**: Gemini API is completely FREE with generous daily limits! No credit card required.

## Step 5: Upload a PDF and Generate Flashcards (1 min)

1. Enter your Google Gemini API key in the input field
2. Drag and drop a PDF file onto the upload zone
   - Or click to browse and select a file
   - Recommended: Start with a 5-10 page PDF
3. Wait for processing (usually 30-60 seconds)
4. Flashcards will be automatically generated!

> 💡 **FREE**: No usage costs with Gemini API!

## Step 6: Start Studying! 🎓

### Try These Gestures:

**Hand Gestures** (Hold your hand in front of the webcam):
- 👋 Open palm + move right → Next card
- 👋 Open palm + move left → Previous card
- 👍 Thumbs up → Mark as understood
- 👎 Thumbs down → Mark for review
- ☝️ Point with index finger → Draw on card
- 🤏 Pinch (thumb + index) → Erase drawing

**Keyboard Shortcuts**:
- `→` or `N` → Next card
- `←` or `P` → Previous card
- `Space` → Flip card
- `U` → Mark as understood
- `R` → Mark for review
- `D` → Toggle dashboard

### Content Modes

Switch between three explanation styles:
- **📚 Detailed**: Full, comprehensive answers
- **📝 Simple**: Easy-to-understand explanations
- **💪 Encouraging**: Motivational, positive reinforcement

The app automatically switches to simpler content when it detects frustration!

### Monitor Your State

Watch the indicators in the top-right:
- **Gesture Detection**: Shows recognized hand gestures
- **Emotion Detection**: Displays your current mood
- **Blink Detection**: Tracks your fatigue level

### Take Smart Breaks

When your blink rate is high (you're getting tired):
1. A break suggestion will appear automatically
2. Choose a guided exercise
3. Follow the timer
4. Return refreshed!

## Tips for Best Experience

### 📸 Webcam Setup
- Ensure good lighting (face the light source)
- Position camera at eye level
- Maintain 1-2 feet distance
- Keep your face and hands visible

### 🖐️ Gesture Recognition
- Make clear, deliberate gestures
- Hold gestures for 1 second
- Avoid quick movements
- Keep hand in frame

### 📄 PDF Selection
- Use text-based PDFs (not scanned images)
- Start with smaller files (< 20 pages)
- Subject matter with clear concepts works best
- Textbooks, notes, and articles are ideal

### 🎯 Study Strategy
1. Go through all cards once with keyboard
2. Practice with gestures for motor memory
3. Focus on cards marked "needs review"
4. Take breaks when suggested
5. Check dashboard to track progress

## Troubleshooting

### ❌ Webcam not detected
- Refresh the page
- Check browser permissions
- Close other apps using the webcam

### ❌ Gestures not working
- Ensure ML models loaded (green indicators)
- Check lighting conditions
- Move hand closer/farther from camera
- Try more exaggerated gestures

### ❌ PDF processing fails
- Verify Gemini API key is correct
- Ensure PDF contains text (not images)
- Try a smaller PDF file
- Check internet connection

### ❌ App is slow
- Close unused browser tabs
- Disable other ML models if not needed
- Use a smaller PDF
- Restart the browser

## Next Steps

Once you're comfortable:

1. **Explore the Dashboard** (press `D`)
   - View study statistics
   - Track difficulty levels
   - Monitor accuracy

2. **Try Drawing Mode**
   - Point with index finger to draw
   - Pinch to erase
   - Annotations save with each card

3. **Experiment with Adaptive Learning**
   - The app learns your difficulty with each card
   - Cards adjust based on your emotion and fatigue
   - Review schedule follows spaced repetition

4. **Track Your Progress**
   - Total cards studied
   - Accuracy percentage
   - Gestures used
   - Breaks taken
   - Session duration

## Need Help?

- 📖 Read the full README.md
- 🐛 Check for known issues
- 💡 Review the troubleshooting section

---

**Happy Studying! 🎓✨**

Remember: The app adapts to YOU. If you're frustrated, it simplifies content. If you're tired, it suggests breaks. Trust the process and study mindfully!
