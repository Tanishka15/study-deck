# 🔧 Installation & Setup Guide

Complete guide to get Mindful Study Deck running on your machine.

## System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Processor**: Dual-core 2.0 GHz or better
- **RAM**: 4 GB (8 GB recommended)
- **Webcam**: Built-in or external (720p or better)
- **Browser**: Chrome 90+, Firefox 88+, Edge 90+, or Safari 14.1+
- **Internet**: Required for downloading dependencies and OpenAI API

### Recommended Setup
- **Processor**: Quad-core 2.5 GHz or better
- **RAM**: 8 GB or more
- **Webcam**: 1080p with good low-light performance
- **Lighting**: Well-lit room for better face/hand detection
- **Browser**: Latest Chrome (best TensorFlow.js performance)

## Prerequisites Installation

### 1. Install Node.js

**macOS** (using Homebrew):
```bash
brew install node
```

**Windows**:
1. Download installer from https://nodejs.org/
2. Run installer and follow prompts
3. Verify installation:
```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show 9.0.0 or higher
```

**Linux** (Ubuntu/Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Verify Git Installation

```bash
git --version  # Should show git version 2.x.x
```

If not installed:
- **macOS**: `brew install git`
- **Windows**: https://git-scm.com/download/win
- **Linux**: `sudo apt-get install git`

## Project Setup

### Step 1: Navigate to Project Directory

```bash
cd /Users/tanishka/Downloads/mini_project_5/mindful-study-deck
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- React and React DOM
- TensorFlow.js and ML models
- PDF.js for PDF processing
- OpenAI SDK
- Tailwind CSS and PostCSS
- Vite and development tools

**Expected Install Time**: 2-5 minutes (depending on internet speed)

### Step 3: Verify Installation

```bash
npm run dev -- --version
```

Should show Vite version without errors.

## First Run

### Start Development Server

```bash
npm run dev
```

**Expected Output**:
```
  VITE v5.0.2  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Open Browser

The app should automatically open at `http://localhost:3000`

If not, manually navigate to the URL shown in the terminal.

## Initial Configuration

### 1. Grant Webcam Permissions

When prompted by your browser:
1. Click "Allow" or "Permit"
2. If blocked, click the camera icon in address bar
3. Select "Always allow" for convenience

**Chrome**: Settings → Privacy and security → Site Settings → Camera
**Firefox**: Preferences → Privacy & Security → Permissions → Camera
**Safari**: Preferences → Websites → Camera

### 2. Get Google Gemini API Key

1. Visit https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key" (or "Get API Key")
4. Copy the key
5. Paste into the app when prompted

**Cost Estimate**:
- **FREE**: Gemini API offers generous free tier
- No credit card required
- 60 requests per minute free
- Perfect for personal study use!

**Rate Limits (Free Tier)**:
- 60 requests per minute
- Plenty for generating flashcards from PDFs

### 3. Test Webcam Feed

You should see:
- Video feed in bottom-right corner
- Red "LIVE" indicator
- Your face visible in the feed

If not, check:
- Camera permissions granted
- No other app using webcam
- Camera not physically blocked

### 4. Wait for ML Models to Load

Look for green indicators:
- ✅ Gesture Detection (top-right)
- ✅ Emotion Detection (top-right)
- ✅ Blink Detection (top-right)

**Initial Load Time**: 10-30 seconds

## Troubleshooting

### Issue: npm install fails

**Error**: `EACCES: permission denied`

**Solution**:
```bash
sudo npm install
# or
npm install --unsafe-perm
```

**Error**: `Network timeout`

**Solution**:
```bash
npm config set registry https://registry.npmjs.org/
npm cache clean --force
npm install
```

### Issue: Webcam not detected

**Check 1**: Permissions
```bash
# Check if camera is accessible
ls /dev/video*  # Linux
# or check System Preferences (macOS)
```

**Check 2**: Other apps using camera
- Close Zoom, Teams, Skype, etc.
- Restart browser

**Check 3**: Browser settings
- Chrome: `chrome://settings/content/camera`
- Firefox: `about:preferences#privacy`
- Make sure localhost is allowed

### Issue: ML models not loading

**Symptom**: Yellow or red indicators, no detection

**Solution 1**: Check console for errors
```
Press F12 → Console tab
Look for TensorFlow.js errors
```

**Solution 2**: Clear cache and reload
```
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

**Solution 3**: Check WebGL support
```
Visit: https://get.webgl.org/
Should see spinning cube
```

If WebGL not supported:
- Update graphics drivers
- Enable hardware acceleration in browser
- Try different browser

### Issue: Gestures not recognized

**Check 1**: Lighting
- Ensure face/hands well-lit
- Avoid backlighting
- Use natural or bright artificial light

**Check 2**: Hand position
- Keep hand 1-2 feet from camera
- Hand should fill ~30% of frame
- Make clear, deliberate gestures

**Check 3**: Model loaded
- Green indicator should show
- If yellow, wait longer
- If red, check console errors

### Issue: PDF processing fails

**Error**: "Could not extract text"

**Cause**: PDF contains images only (scanned)

**Solution**: Use text-based PDFs or OCR software first

**Error**: "OpenAI API error"
**Error**: "Gemini API error"

**Solutions**:
- Verify API key is correct (get free key at https://makersuite.google.com/app/apikey)
- Check internet connection
- Ensure you haven't exceeded rate limits (60 req/min)
- Try smaller PDF first

### Issue: High CPU/Memory usage

**Symptoms**: Browser slow, fan spinning

**Solutions**:
```bash
# Check system resources
top  # macOS/Linux
# or Task Manager (Windows)

# Reduce load:
1. Close other tabs
2. Disable one detector temporarily
3. Use smaller PDFs
4. Restart browser
```

**Optimize**:
- Lower detection rates in code
- Reduce video resolution
- Use one ML model at a time

### Issue: App crashes or freezes

**Quick Fix**:
```bash
# Stop server
Ctrl+C

# Clear cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

**Nuclear Option**:
```bash
# Reinstall everything
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Emotion detection inaccurate

**Improvements**:
- Face camera directly
- Ensure face fully visible
- Avoid glasses that reflect light
- Make more exaggerated expressions
- Wait for several detections (algorithm uses history)

### Issue: Port 3000 already in use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution 1**: Use different port
```bash
npm run dev -- --port 3001
```

**Solution 2**: Kill process using port
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Advanced Configuration

### Change Detection Rates

Edit hooks to adjust performance:

**useGestures.js** (line ~120):
```javascript
// Change from 66ms (15 FPS) to 100ms (10 FPS)
detectionIntervalRef.current = setInterval(detectGestures, 100);
```

**useEmotions.js** (line ~140):
```javascript
// Change from 2500ms to 5000ms (every 5 seconds)
detectionIntervalRef.current = setInterval(detectEmotion, 5000);
```

### Customize Gesture Thresholds

**gestureRecognition.js**:
```javascript
// Make swipe less sensitive (line ~110)
const threshold = 0.7; // Was 0.5

// Make pinch more sensitive (line ~75)
return pinchDistance < 0.08; // Was 0.05
```

### Adjust Blink Threshold

**useBlinks.js** (line ~20):
```javascript
const earThresholdRef = useRef(0.20); // Was 0.25, lower = more sensitive
```

### Change Frustration Sensitivity

**useEmotions.js** (line ~100):
```javascript
// Require higher frustration for mode switch
const isFrustrated = frustrationScore > 50; // Was 35
```

## Production Build

### Create Optimized Build

```bash
npm run build
```

Output will be in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Deploy to Static Hosting

**Vercel**:
```bash
npm install -g vercel
vercel
```

**Netlify**:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**GitHub Pages**:
```bash
# Add to package.json:
"homepage": "https://yourusername.github.io/mindful-study-deck",

# Install gh-pages
npm install --save-dev gh-pages

# Add to scripts:
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"

# Deploy
npm run deploy
```

## Environment Variables (Optional)

Create `.env` file (don't commit to Git):

```bash
# .env
VITE_GEMINI_API_KEY=your-gemini-key-here
```

Update `flashcardGenerator.js` to use:
```javascript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || userProvidedKey;
```

## Development Tools

### Install VS Code Extensions (Recommended)

```
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- ESLint
- Prettier
- Error Lens
```

### Enable Format on Save

VS Code settings.json:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Debug in VS Code

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

## Health Checks

Run these commands to verify everything works:

```bash
# Check Node version
node --version  # Should be 18+

# Check npm version
npm --version   # Should be 9+

# List installed packages
npm list --depth=0

# Check for outdated packages
npm outdated

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Getting Help

### Check Logs

Browser console (F12):
```javascript
// Look for errors starting with:
- "Error initializing"
- "Failed to load"
- "TensorFlow.js"
```

Terminal output:
```bash
# Look for errors in dev server
npm run dev
```

### Common Log Messages

✅ **Normal**:
```
[vite] connecting...
[vite] connected.
TensorFlow.js initialized
Models loaded successfully
```

❌ **Problems**:
```
Failed to fetch
CORS error
WebGL not supported
Module not found
```

### Resources

- **TensorFlow.js**: https://www.tensorflow.org/js
- **MediaPipe**: https://google.github.io/mediapipe/
- **PDF.js**: https://mozilla.github.io/pdf.js/
- **Google Gemini API**: https://makersuite.google.com/app/apikey
- **React Docs**: https://react.dev/

---

## Quick Command Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Create production build
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Maintenance
npm install          # Install dependencies
npm update           # Update dependencies
npm audit            # Check for vulnerabilities
npm cache clean -f   # Clear npm cache

# Debugging
npm list             # List installed packages
npm outdated         # Check for updates
node --version       # Check Node version
npm --version        # Check npm version
```

---

**Now you're ready to start studying smarter! 🚀**

If you encounter any issues not covered here, check the console for specific error messages and search for solutions based on those errors.
