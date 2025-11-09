import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Create sample flashcards for demo/fallback purposes
 */
function createSampleFlashcards() {
  const now = Date.now();
  return [
    {
      id: `sample_${now}_1`,
      front: 'What is spaced repetition and why is it effective?',
      back_original: 'Spaced repetition is a learning technique that involves reviewing information at increasing intervals over time. It works by leveraging the psychological spacing effect, where our brains retain information better when learning sessions are spread out. This method strengthens long-term memory by reviewing material just as you\'re about to forget it.',
      back_simple: 'Spaced repetition means reviewing things over time instead of all at once. You see information again right before you forget it, which helps you remember it longer.',
      back_encouraging: 'Great question! Spaced repetition is your secret weapon for learning. By reviewing at the perfect moments, you\'re training your brain to hold onto information effortlessly. Keep it up!',
      timesReviewed: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      easinessFactor: 2.5,
      interval: 0,
      nextReviewDate: new Date(),
      lastReviewed: null,
      markedAsUnderstood: false,
      markedAsNeedsReview: false,
      drawing: null,
      currentMode: 'original'
    },
    {
      id: `sample_${now}_2`,
      front: 'How does the Mindful Study Deck adapt to your learning?',
      back_original: 'The Mindful Study Deck uses an SM-2 algorithm that tracks your performance on each card. Cards you find easy appear less frequently, while challenging cards return sooner. The system also monitors your emotional state and blink rate to detect fatigue, suggesting breaks when needed.',
      back_simple: 'The app learns from your answers. Easy cards show up less often, hard ones come back sooner. It also watches for signs you\'re getting tired and suggests breaks.',
      back_encouraging: 'You\'re in control here! The app adjusts to YOUR pace. Struggling with a concept? It\'ll give you more practice. Nailing it? It steps back. You\'ve got this!',
      timesReviewed: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      easinessFactor: 2.5,
      interval: 0,
      nextReviewDate: new Date(),
      lastReviewed: null,
      markedAsUnderstood: false,
      markedAsNeedsReview: false,
      drawing: null,
      currentMode: 'original'
    },
    {
      id: `sample_${now}_3`,
      front: 'What are the three answer modes available for each flashcard?',
      back_original: 'Each flashcard offers three presentation modes: Original (detailed and comprehensive), Simple (beginner-friendly with clear language), and Encouraging (motivational with positive reinforcement). You can switch between modes based on your current needs and confidence level.',
      back_simple: 'Each card has three versions: detailed, simple, and encouraging. Pick the one that helps you most right now.',
      back_encouraging: 'Love this feature! Feeling confused? Try the simple version. Need a confidence boost? Go encouraging. The detailed version is there when you\'re ready to dive deep!',
      timesReviewed: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      easinessFactor: 2.5,
      interval: 0,
      nextReviewDate: new Date(),
      lastReviewed: null,
      markedAsUnderstood: false,
      markedAsNeedsReview: false,
      drawing: null,
      currentMode: 'original'
    },
    {
      id: `sample_${now}_4`,
      front: 'How can hand gestures enhance your study experience?',
      back_original: 'Hand gesture control allows you to navigate flashcards, mark answers as correct or incorrect, and control the app without touching your keyboard. This hands-free interaction keeps you in a focused flow state and makes studying more natural and engaging.',
      back_simple: 'You can use hand gestures to flip cards and mark answers without using your keyboard. It keeps you focused and makes studying feel more natural.',
      back_encouraging: 'This is where it gets fun! Swipe to move cards, thumbs up when you know it. Stay in your zone and let your hands do the talking. You\'re crushing it!',
      timesReviewed: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      easinessFactor: 2.5,
      interval: 0,
      nextReviewDate: new Date(),
      lastReviewed: null,
      markedAsUnderstood: false,
      markedAsNeedsReview: false,
      drawing: null,
      currentMode: 'original'
    }
  ];
}

/**
 * Generate flashcards from text chunks using Google Gemini API
 * @param {string[]} chunks - Text chunks from PDF
 * @param {string} apiKey - Google Gemini API key
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Array>} - Array of flashcard objects
 */
export async function generateFlashcards(chunks, apiKey, onProgress = null) {
  // If no API key or empty chunks, return sample flashcards
  if (!apiKey || !chunks || chunks.length === 0) {
    console.log('No API key or chunks provided. Returning sample flashcards.');
    if (onProgress) {
      onProgress(1, 1);
    }
    return createSampleFlashcards();
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const allCards = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    if (onProgress) {
      onProgress(i + 1, chunks.length);
    }

    try {
      const prompt = `You are an expert educator creating flashcards for studying. Generate 2-5 flashcards from the given text.

For each flashcard, provide:
1. front: A clear question or prompt (10-20 words)
2. back_original: A detailed, comprehensive answer (30-80 words)
3. back_simple: A simplified explanation suitable for beginners (20-40 words)
4. back_encouraging: A motivational version with encouragement (25-50 words)

Return ONLY valid JSON in this exact format:
{
  "flashcards": [
    {
      "front": "question here",
      "back_original": "detailed answer here",
      "back_simple": "simple explanation here",
      "back_encouraging": "encouraging version here"
    }
  ]
}

Create flashcards from this text:

${chunk}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();
      
      // Try to parse JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (e) {
        // If not valid JSON, try to extract JSON from markdown code blocks
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[1]);
        } else {
          console.error('Failed to parse OpenAI response:', responseText);
          continue;
        }
      }

      if (parsedResponse.flashcards && Array.isArray(parsedResponse.flashcards)) {
        const cardsWithMetadata = parsedResponse.flashcards.map((card, idx) => ({
          id: `card_${Date.now()}_${i}_${idx}`,
          ...card,
          // Learning metrics
          timesReviewed: 0,
          timesCorrect: 0,
          timesIncorrect: 0,
          easinessFactor: 2.5, // SM-2 default
          interval: 0,
          nextReviewDate: new Date(),
          lastReviewed: null,
          markedAsUnderstood: false,
          markedAsNeedsReview: false,
          // Drawing data
          drawing: null,
          // Current display mode
          currentMode: 'original' // 'original', 'simple', or 'encouraging'
        }));
        
        allCards.push(...cardsWithMetadata);
      }
    } catch (error) {
      console.error(`Error generating flashcards for chunk ${i}:`, error);
      // Continue with next chunk even if one fails
    }
  }

  return allCards;
}
