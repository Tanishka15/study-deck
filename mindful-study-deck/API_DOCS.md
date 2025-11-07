# 🔌 API & Component Documentation

Developer reference for the Mindful Study Deck codebase.

## Table of Contents
1. [Component API](#component-api)
2. [Custom Hooks](#custom-hooks)
3. [Utility Functions](#utility-functions)
4. [Type Definitions](#type-definitions)
5. [Integration Guide](#integration-guide)

---

## Component API

### PDFUpload

Upload and process PDF files to generate flashcards.

**Props**:
```javascript
{
  onFlashcardsGenerated: (flashcards: Array<Flashcard>) => void
}
```

**Usage**:
```jsx
<PDFUpload onFlashcardsGenerated={(cards) => setFlashcards(cards)} />
```

**Events**:
- Drag & drop PDF file
- File picker selection
- Progress updates during processing
- Error display

---

### Flashcard

Display a single flashcard with flip animation and multiple content modes.

**Props**:
```javascript
{
  card: Flashcard,              // Flashcard object
  isFlipped: boolean,           // Current flip state
  onFlip: () => void,          // Flip callback
  emotion: string,              // Current emotion ('happy', 'angry', 'neutral')
  isFrustrated: boolean        // Frustration flag
}
```

**Usage**:
```jsx
<Flashcard
  card={flashcards[currentIndex]}
  isFlipped={isFlipped}
  onFlip={() => setIsFlipped(!isFlipped)}
  emotion={currentEmotion}
  isFrustrated={isFrustrated}
/>
```

**Content Modes**:
- `original`: Detailed explanation
- `simple`: Simplified version
- `encouraging`: Motivational version

---

### WebcamStream

Display live webcam feed with status indicators.

**Props**: None (uses internal useWebcam hook)

**Usage**:
```jsx
<WebcamStream />
```

**Features**:
- Auto-initialization
- Permission handling
- Error display
- Live indicator

---

### GestureDetector

Detect and display hand gestures from webcam stream.

**Props**:
```javascript
{
  videoElement: HTMLVideoElement,  // Video element with stream
  onGesture: (gesture: Gesture) => void,  // Gesture callback
  enabled: boolean                 // Enable/disable detection
}
```

**Usage**:
```jsx
<GestureDetector
  videoElement={videoRef.current}
  onGesture={handleGesture}
  enabled={true}
/>
```

**Gesture Types**:
- `swipe` (with `direction`: 'left' | 'right')
- `thumbs_up`
- `thumbs_down`
- `pinch`
- `point`
- `open_palm`

---

### EmotionDetector

Detect emotions from facial expressions.

**Props**:
```javascript
{
  videoElement: HTMLVideoElement,
  onEmotionChange: (emotion: string, isFrustrated: boolean) => void,
  enabled: boolean
}
```

**Usage**:
```jsx
<EmotionDetector
  videoElement={videoRef.current}
  onEmotionChange={(emotion, frustrated) => {
    setCurrentEmotion(emotion);
    setIsFrustrated(frustrated);
  }}
  enabled={true}
/>
```

**Emotions**:
- `happy`
- `angry`
- `neutral`

---

### BlinkDetector

Track blinks and detect fatigue.

**Props**:
```javascript
{
  videoElement: HTMLVideoElement,
  onFatigueDetected: () => void,
  enabled: boolean
}
```

**Usage**:
```jsx
<BlinkDetector
  videoElement={videoRef.current}
  onFatigueDetected={() => setShowBreakModal(true)}
  enabled={true}
/>
```

**Metrics**:
- Blink count
- Blink rate (per minute)
- Fatigue status

---

### DrawingCanvas

Overlay canvas for gesture-based drawing.

**Props**:
```javascript
{
  fingerTipPosition: {x: number, y: number, z: number} | null,
  gesture: Gesture | null,
  width: number,
  height: number,
  onSaveDrawing: (imageData: string | null) => void
}
```

**Usage**:
```jsx
<DrawingCanvas
  fingerTipPosition={fingerTipPosition}
  gesture={currentGesture}
  width={800}
  height={600}
  onSaveDrawing={(data) => saveToCard(data)}
/>
```

**Modes**:
- Point gesture → Draw
- Pinch gesture → Erase
- Other → No action

---

### BreakModal

Display break suggestion with exercises.

**Props**:
```javascript
{
  isOpen: boolean,
  onClose: () => void,
  onStartBreak: () => void
}
```

**Usage**:
```jsx
<BreakModal
  isOpen={showBreakModal}
  onClose={() => setShowBreakModal(false)}
  onStartBreak={handleStartBreak}
/>
```

---

### Dashboard

Display session statistics and analytics.

**Props**:
```javascript
{
  cards: Array<Flashcard>,
  sessionStats: SessionStats
}
```

**Usage**:
```jsx
<Dashboard
  cards={flashcards}
  sessionStats={{
    duration: '45m',
    gesturesUsed: 38,
    breaksTaken: 1,
    frustrationEvents: 2
  }}
/>
```

---

## Custom Hooks

### useWebcam()

Access and manage webcam stream.

**Returns**:
```javascript
{
  stream: MediaStream | null,
  videoRef: React.RefObject,
  error: string | null,
  isLoading: boolean,
  stopWebcam: () => void
}
```

**Usage**:
```javascript
const { videoRef, stream, error, isLoading } = useWebcam();

// Attach to video element
<video ref={videoRef} autoPlay />
```

**Lifecycle**:
- Auto-initializes on mount
- Requests camera permissions
- Cleans up stream on unmount

---

### useGestures(videoElement)

Detect hand gestures from video stream.

**Parameters**:
```javascript
videoElement: HTMLVideoElement | null
```

**Returns**:
```javascript
{
  currentGesture: {
    type: string,
    direction?: string,
    confidence: number
  } | null,
  handLandmarks: Array<{x, y, z}> | null,
  fingerTipPosition: {x, y, z} | null,
  isReady: boolean,
  clearGesture: () => void
}
```

**Usage**:
```javascript
const { currentGesture, handLandmarks, fingerTipPosition, isReady } = 
  useGestures(videoRef.current);

useEffect(() => {
  if (currentGesture?.type === 'swipe') {
    navigate(currentGesture.direction);
  }
}, [currentGesture]);
```

**Detection Rate**: 15 FPS (~66ms)

---

### useEmotions(videoElement)

Track facial emotions and frustration.

**Parameters**:
```javascript
videoElement: HTMLVideoElement | null
```

**Returns**:
```javascript
{
  currentEmotion: 'happy' | 'angry' | 'neutral',
  emotionHistory: Array<{emotion, timestamp}>,
  frustrationScore: number,  // 0-100
  isFrustrated: boolean,
  isReady: boolean
}
```

**Usage**:
```javascript
const { currentEmotion, frustrationScore, isFrustrated } = 
  useEmotions(videoRef.current);

// Auto-switch content mode when frustrated
useEffect(() => {
  if (isFrustrated) {
    setContentMode('simple');
  }
}, [isFrustrated]);
```

**Detection Rate**: Every 2.5 seconds
**Frustration Threshold**: 35% angry emotions in 30s

---

### useBlinks(videoElement)

Detect blinks and monitor fatigue.

**Parameters**:
```javascript
videoElement: HTMLVideoElement | null
```

**Returns**:
```javascript
{
  blinkCount: number,
  blinkRate: number,  // Per minute
  isTired: boolean,
  shouldSuggestBreak: boolean,
  consecutiveTiredMinutes: number,
  isReady: boolean,
  resetBlinkCount: () => void
}
```

**Usage**:
```javascript
const { blinkRate, shouldSuggestBreak } = useBlinks(videoRef.current);

useEffect(() => {
  if (shouldSuggestBreak) {
    showBreakModal();
  }
}, [shouldSuggestBreak]);
```

**Detection Rate**: 30 FPS (~33ms)
**Thresholds**:
- Normal: 15-20 blinks/min
- Tired: 24+ blinks/min
- Break suggestion: 2+ consecutive tired minutes

---

## Utility Functions

### pdfProcessor.js

#### extractTextFromPDF(file)

Extract text content from PDF file.

**Parameters**:
```javascript
file: File  // PDF file object
```

**Returns**:
```javascript
Promise<string>  // Extracted text
```

**Usage**:
```javascript
const text = await extractTextFromPDF(pdfFile);
```

**Throws**: Error if PDF is invalid or extraction fails

---

#### chunkText(text, maxChunkSize)

Split text into logical chunks for processing.

**Parameters**:
```javascript
text: string
maxChunkSize: number = 2000
```

**Returns**:
```javascript
Array<string>  // Text chunks
```

**Usage**:
```javascript
const chunks = chunkText(extractedText, 2000);
```

**Logic**:
- Splits on paragraph breaks
- Maintains semantic boundaries
- Filters very small chunks (< 50 chars)

---

### flashcardGenerator.js

#### generateFlashcards(chunks, apiKey, onProgress)

Generate flashcards from text using Google Gemini API.

**Parameters**:
```javascript
chunks: Array<string>
apiKey: string  // Gemini API key
onProgress: (current: number, total: number) => void
```

**Returns**:
```javascript
Promise<Array<Flashcard>>
```

**Usage**:
```javascript
const cards = await generateFlashcards(
  textChunks,
  'your-gemini-api-key',
  (current, total) => {
    console.log(`Processing ${current}/${total}`);
  }
);
```

**Note**: Get free Gemini API key at https://makersuite.google.com/app/apikey

**Flashcard Structure**:
```javascript
{
  id: string,
  front: string,           // Question
  back_original: string,   // Detailed answer
  back_simple: string,     // Simple explanation
  back_encouraging: string, // Motivational version
  timesReviewed: number,
  timesCorrect: number,
  timesIncorrect: number,
  easinessFactor: number,
  interval: number,
  nextReviewDate: Date,
  lastReviewed: Date | null,
  markedAsUnderstood: boolean,
  markedAsNeedsReview: boolean,
  drawing: string | null,
  currentMode: 'original' | 'simple' | 'encouraging'
}
```

---

### spacedRepetition.js

#### updateCardMetrics(card, quality)

Update card learning metrics based on performance.

**Parameters**:
```javascript
card: Flashcard
quality: number  // 0-5 (0 = failure, 5 = perfect)
```

**Returns**:
```javascript
Flashcard  // Updated card
```

**Quality Ratings**:
- 0: Complete blackout
- 1: Incorrect, vague memory
- 2: Incorrect but remembered
- 3: Correct with difficulty
- 4: Correct with hesitation
- 5: Perfect recall

**Usage**:
```javascript
// Mark as understood
const updated = updateCardMetrics(card, 5);

// Mark as needs review
const updated = updateCardMetrics(card, 2);
```

---

#### getNextCard(cards, emotion, blinkRate, currentIndex)

Select next card using adaptive algorithm.

**Parameters**:
```javascript
cards: Array<Flashcard>
emotion: string = 'neutral'
blinkRate: number = 17
currentIndex: number = -1
```

**Returns**:
```javascript
number  // Index of next card
```

**Usage**:
```javascript
const nextIndex = getNextCard(
  flashcards,
  currentEmotion,
  blinkRate,
  currentCardIndex
);
setCurrentCardIndex(nextIndex);
```

**Selection Factors**:
- Review schedule (due date)
- Emotion state (avoid hard cards when frustrated)
- Fatigue level (avoid hard cards when tired)
- Mark status (prioritize "needs review")
- Difficulty level

---

#### calculateDifficulty(card)

Calculate difficulty score for a card.

**Parameters**:
```javascript
card: Flashcard
```

**Returns**:
```javascript
number  // 0-10 (0 = easy, 10 = very hard)
```

**Usage**:
```javascript
const difficulty = calculateDifficulty(card);

if (difficulty > 7 && isFrustrated) {
  // Skip this card
}
```

**Calculation**:
- Based on success rate
- Adjusted by easiness factor
- Returns 5 for new cards

---

### gestureRecognition.js

#### isOpenPalm(landmarks)

Check if hand is in open palm position.

**Parameters**:
```javascript
landmarks: Array<{x, y, z}>  // 21 hand landmarks
```

**Returns**: `boolean`

---

#### isIndexFingerExtended(landmarks)

Check if only index finger is extended (drawing gesture).

**Parameters**:
```javascript
landmarks: Array<{x, y, z}>
```

**Returns**: `boolean`

---

#### isPinchGesture(landmarks)

Check if thumb and index finger are touching (erase gesture).

**Parameters**:
```javascript
landmarks: Array<{x, y, z}>
```

**Returns**: `boolean`

---

#### isThumbsUp(landmarks) / isThumbsDown(landmarks)

Check for thumbs up/down gestures.

**Parameters**:
```javascript
landmarks: Array<{x, y, z}>
```

**Returns**: `boolean`

---

#### detectSwipe(history)

Detect swipe gesture from movement history.

**Parameters**:
```javascript
history: Array<{x, y, timestamp, isOpenPalm}>
```

**Returns**:
```javascript
'left' | 'right' | null
```

**Usage**:
```javascript
const swipe = detectSwipe(handPositionHistory);
if (swipe === 'right') navigateNext();
```

---

#### getFingerTipPosition(landmarks)

Get normalized fingertip coordinates for drawing.

**Parameters**:
```javascript
landmarks: Array<{x, y, z}>
```

**Returns**:
```javascript
{x: number, y: number, z: number} | null
```

**Usage**:
```javascript
const tipPos = getFingerTipPosition(handLandmarks);
if (tipPos) {
  const canvasX = tipPos.x * canvasWidth;
  const canvasY = tipPos.y * canvasHeight;
  draw(canvasX, canvasY);
}
```

---

## Type Definitions

### Flashcard
```typescript
interface Flashcard {
  id: string;
  front: string;
  back_original: string;
  back_simple: string;
  back_encouraging: string;
  timesReviewed: number;
  timesCorrect: number;
  timesIncorrect: number;
  easinessFactor: number;
  interval: number;
  nextReviewDate: Date;
  lastReviewed: Date | null;
  markedAsUnderstood: boolean;
  markedAsNeedsReview: boolean;
  drawing: string | null;
  currentMode: 'original' | 'simple' | 'encouraging';
}
```

### Gesture
```typescript
interface Gesture {
  type: 'swipe' | 'thumbs_up' | 'thumbs_down' | 'pinch' | 'point' | 'open_palm';
  direction?: 'left' | 'right';
  confidence: number;
}
```

### SessionStats
```typescript
interface SessionStats {
  duration: string;
  gesturesUsed: number;
  breaksTaken: number;
  frustrationEvents: number;
  startTime: number;
  avgEmotion?: string;
}
```

---

## Integration Guide

### Adding a New Gesture

1. **Define gesture recognition function** in `gestureRecognition.js`:
```javascript
export function isFist(landmarks) {
  // Check if all fingers are curled
  // Return boolean
}
```

2. **Add detection** in `useGestures.js`:
```javascript
const fist = isFist(landmarks);
if (fist) {
  setCurrentGesture({ type: 'fist', confidence: 0.9 });
}
```

3. **Handle gesture** in `App.jsx`:
```javascript
case 'fist':
  handleCustomAction();
  break;
```

### Adding a New Emotion

1. **Update classification** in `useEmotions.js`:
```javascript
if (/* conditions */) {
  return 'surprised';
}
```

2. **Add emoji** in `EmotionDetector.jsx`:
```javascript
case 'surprised':
  return '😲';
```

3. **Handle in App**:
```javascript
if (currentEmotion === 'surprised') {
  // Custom behavior
}
```

### Creating Custom Break Exercise

1. **Add exercise** in `BreakModal.jsx`:
```javascript
<div className="p-4 bg-indigo-50 rounded-lg">
  <h3>🧘 Meditation (3 min)</h3>
  <p>Close eyes, focus on breathing...</p>
</div>
```

2. **Update timer**:
```javascript
<BreakTimerModal duration={180} />  // 3 minutes
```

---

## Best Practices

### Performance
- Limit detection rates appropriately
- Use `useRef` for frequently updated values
- Debounce gesture actions
- Clean up intervals on unmount

### Error Handling
- Always check for null/undefined before using ML outputs
- Provide fallbacks for failed model loading
- Show user-friendly error messages
- Log errors to console for debugging

### State Management
- Keep ML state separate from UI state
- Use callbacks for async operations
- Avoid state updates in tight loops
- Use functional updates for dependent state

### Testing
- Test with different lighting conditions
- Verify gestures at various distances
- Check emotion detection with different expressions
- Monitor performance over time

---

**For more examples, see the source code and USAGE_EXAMPLES.md**
