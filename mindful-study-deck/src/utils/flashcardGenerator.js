import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generate flashcards from text chunks using Google Gemini API
 * @param {string[]} chunks - Text chunks from PDF
 * @param {string} apiKey - Google Gemini API key
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Array>} - Array of flashcard objects
 */
export async function generateFlashcards(chunks, apiKey, onProgress = null) {
  if (!apiKey) {
    throw new Error('Google Gemini API key is required');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
