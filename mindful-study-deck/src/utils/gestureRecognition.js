/**
 * Gesture recognition utilities for hand landmarks
 */

/**
 * Calculate distance between two points
 */
function distance(point1, point2) {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = (point1.z || 0) - (point2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Detect if hand is in open palm position
 */
export function isOpenPalm(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  
  // All fingertips should be extended away from wrist
  const thumbExtended = distance(thumbTip, wrist) > 0.15;
  const indexExtended = distance(indexTip, wrist) > 0.20;
  const middleExtended = distance(middleTip, wrist) > 0.22;
  const ringExtended = distance(ringTip, wrist) > 0.20;
  const pinkyExtended = distance(pinkyTip, wrist) > 0.17;
  
  return thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended;
}

/**
 * Detect index finger extended (for drawing)
 */
export function isIndexFingerExtended(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  
  const wrist = landmarks[0];
  const indexTip = landmarks[8];
  const indexMCP = landmarks[5];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  
  // Index finger extended
  const indexExtended = distance(indexTip, wrist) > distance(indexMCP, wrist) + 0.05;
  
  // Other fingers curled
  const middleCurled = distance(middleTip, wrist) < 0.15;
  const ringCurled = distance(ringTip, wrist) < 0.13;
  const pinkyCurled = distance(pinkyTip, wrist) < 0.11;
  
  return indexExtended && middleCurled && ringCurled && pinkyCurled;
}

/**
 * Detect pinch gesture (thumb and index finger touching)
 */
export function isPinchGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  
  const pinchDistance = distance(thumbTip, indexTip);
  return pinchDistance < 0.05; // Close together
}

/**
 * Detect thumbs up gesture
 */
export function isThumbsUp(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const indexMCP = landmarks[5];
  const middleMCP = landmarks[9];
  const ringMCP = landmarks[13];
  const pinkyMCP = landmarks[17];
  
  // Thumb pointing up (y coordinate decreases upward)
  const thumbUp = thumbTip.y < thumbIP.y && thumbTip.y < wrist.y;
  
  // Other fingers curled (close to palm)
  const avgMCPY = (indexMCP.y + middleMCP.y + ringMCP.y + pinkyMCP.y) / 4;
  const fingersCurled = Math.abs(wrist.y - avgMCPY) < 0.15;
  
  return thumbUp && fingersCurled;
}

/**
 * Detect thumbs down gesture
 */
export function isThumbsDown(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const indexMCP = landmarks[5];
  const middleMCP = landmarks[9];
  const ringMCP = landmarks[13];
  const pinkyMCP = landmarks[17];
  
  // Thumb pointing down
  const thumbDown = thumbTip.y > thumbIP.y && thumbTip.y > wrist.y;
  
  // Other fingers curled
  const avgMCPY = (indexMCP.y + middleMCP.y + ringMCP.y + pinkyMCP.y) / 4;
  const fingersCurled = Math.abs(wrist.y - avgMCPY) < 0.15;
  
  return thumbDown && fingersCurled;
}

/**
 * Detect swipe gesture based on hand movement history
 * @param {Array} history - Array of recent hand positions with timestamps
 * @returns {string|null} - 'left', 'right', or null
 */
export function detectSwipe(history) {
  if (history.length < 5) return null;
  
  // Use last 10 frames or available history
  const recentFrames = history.slice(-10);
  
  // Calculate horizontal velocity
  let totalDeltaX = 0;
  let totalTime = 0;
  
  for (let i = 1; i < recentFrames.length; i++) {
    const current = recentFrames[i];
    const previous = recentFrames[i - 1];
    
    totalDeltaX += current.x - previous.x;
    totalTime += current.timestamp - previous.timestamp;
  }
  
  if (totalTime === 0) return null;
  
  const velocityX = totalDeltaX / totalTime;
  const threshold = 0.5; // Adjust based on testing
  
  // Check if hand is in open palm
  const lastFrame = recentFrames[recentFrames.length - 1];
  if (!lastFrame.isOpenPalm) return null;
  
  if (velocityX > threshold) {
    return 'right';
  } else if (velocityX < -threshold) {
    return 'left';
  }
  
  return null;
}

/**
 * Get fingertip position for drawing (normalized coordinates)
 */
export function getFingerTipPosition(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  
  const indexTip = landmarks[8];
  return {
    x: indexTip.x,
    y: indexTip.y,
    z: indexTip.z || 0
  };
}
