/**
 * SM-2 Spaced Repetition Algorithm Implementation
 * Based on SuperMemo 2 algorithm
 */

/**
 * Calculate next review date based on performance
 * @param {Object} card - Flashcard object
 * @param {number} quality - Quality of recall (0-5, where 0 is complete failure, 5 is perfect)
 * @returns {Object} - Updated card with new learning metrics
 */
export function updateCardMetrics(card, quality) {
  const updatedCard = { ...card };
  
  // Update review counts
  updatedCard.timesReviewed += 1;
  if (quality >= 3) {
    updatedCard.timesCorrect += 1;
  } else {
    updatedCard.timesIncorrect += 1;
  }
  
  updatedCard.lastReviewed = new Date();
  
  // SM-2 algorithm
  if (quality >= 3) {
    // Correct response
    if (updatedCard.interval === 0) {
      updatedCard.interval = 1;
    } else if (updatedCard.interval === 1) {
      updatedCard.interval = 6;
    } else {
      updatedCard.interval = Math.round(updatedCard.interval * updatedCard.easinessFactor);
    }
    
    // Update easiness factor
    updatedCard.easinessFactor = Math.max(
      1.3,
      updatedCard.easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  } else {
    // Incorrect response - reset interval
    updatedCard.interval = 0;
    updatedCard.easinessFactor = Math.max(1.3, updatedCard.easinessFactor - 0.2);
  }
  
  // Calculate next review date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + updatedCard.interval);
  updatedCard.nextReviewDate = nextDate;
  
  return updatedCard;
}

/**
 * Calculate difficulty score for a card (0-10, higher = harder)
 * @param {Object} card - Flashcard object
 * @returns {number} - Difficulty score
 */
export function calculateDifficulty(card) {
  if (card.timesReviewed === 0) return 5; // Unknown difficulty
  
  const successRate = card.timesCorrect / card.timesReviewed;
  const difficultyFromSuccess = (1 - successRate) * 10;
  const difficultyFromEF = (3.0 - card.easinessFactor) * 2;
  
  return Math.max(0, Math.min(10, (difficultyFromSuccess + difficultyFromEF) / 2));
}

/**
 * Get next card to study based on adaptive learning algorithm
 * @param {Array} cards - All flashcards
 * @param {string} currentEmotion - Current detected emotion ('happy', 'angry', 'neutral')
 * @param {number} blinkRate - Current blink rate (blinks per minute)
 * @param {number} currentIndex - Current card index (to avoid immediate repeats)
 * @returns {number} - Index of next card to study
 */
export function getNextCard(cards, currentEmotion = 'neutral', blinkRate = 17, currentIndex = -1) {
  if (cards.length === 0) return -1;
  if (cards.length === 1) return 0;
  
  const now = new Date();
  const isFrustrated = currentEmotion === 'angry';
  const isTired = blinkRate > 24;
  
  // Score each card
  const cardScores = cards.map((card, index) => {
    if (index === currentIndex) return { index, score: -1000 }; // Avoid immediate repeat
    
    const difficulty = calculateDifficulty(card);
    const daysSinceReview = card.lastReviewed 
      ? (now - new Date(card.lastReviewed)) / (1000 * 60 * 60 * 24)
      : 999;
    const daysUntilDue = (new Date(card.nextReviewDate) - now) / (1000 * 60 * 60 * 24);
    
    let score = 0;
    
    // Prioritize cards that are due for review
    if (daysUntilDue <= 0) {
      score += 100;
    } else {
      score -= daysUntilDue * 5;
    }
    
    // Prioritize cards that haven't been reviewed recently
    score += Math.min(daysSinceReview * 10, 50);
    
    // Avoid hard cards when frustrated or tired
    if (isFrustrated || isTired) {
      score -= difficulty * 15;
    }
    
    // Prioritize cards marked as needs review
    if (card.markedAsNeedsReview) {
      score += 30;
    }
    
    // Slightly deprioritize cards marked as understood
    if (card.markedAsUnderstood) {
      score -= 20;
    }
    
    return { index, score };
  });
  
  // Sort by score and pick the highest
  cardScores.sort((a, b) => b.score - a.score);
  
  return cardScores[0].index;
}

/**
 * Filter cards that should be shown based on current state
 * @param {Array} cards - All flashcards
 * @param {string} currentEmotion - Current detected emotion
 * @param {number} blinkRate - Current blink rate
 * @returns {Array} - Filtered array of card indices
 */
export function filterAvailableCards(cards, currentEmotion = 'neutral', blinkRate = 17) {
  const isFrustrated = currentEmotion === 'angry';
  const isTired = blinkRate > 24;
  
  if (!isFrustrated && !isTired) {
    return cards.map((_, idx) => idx); // All cards available
  }
  
  // Filter out difficult cards when struggling
  return cards
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => {
      const difficulty = calculateDifficulty(card);
      return difficulty < 7; // Only show easier cards
    })
    .map(({ idx }) => idx);
}
