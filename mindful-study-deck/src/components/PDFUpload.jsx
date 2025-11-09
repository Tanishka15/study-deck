import React, { useState, useCallback } from 'react';

export default function PDFUpload({ onFlashcardsGenerated }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [error, setError] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      await processPDF(pdfFile);
    } else {
      setError('Please drop a PDF file');
    }
  }, []);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      await processPDF(file);
    } else {
      setError('Please select a PDF file');
    }
  }, []);

  const processPDF = async (file) => {
    // Read API key from environment (optional). If absent, we'll fall back to sample cards.
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    setIsProcessing(true);
    setError(null);
    setProgress({ current: 0, total: 0, stage: 'Extracting text from PDF...' });

    try {
      console.log('Processing PDF:', file.name);
      
      // Import utilities dynamically
      const { extractTextFromPDF, chunkText } = await import('../utils/pdfProcessor');
      const { generateFlashcards } = await import('../utils/flashcardGenerator');

      // Extract text
      console.log('Extracting text from PDF...');
      const text = await extractTextFromPDF(file);
      console.log('Text extracted:', text.length, 'characters');
      
      if (!text || text.trim().length < 50) {
        console.warn('Not enough text extracted. Using sample flashcards.');
        // Fall back to sample flashcards
        const sampleCards = await generateFlashcards([], null);
        if (sampleCards.length > 0) {
          setProgress({ current: 3, total: 3, stage: `Created ${sampleCards.length} sample flashcards!` });
          setTimeout(() => {
            onFlashcardsGenerated(sampleCards);
            setIsProcessing(false);
          }, 1000);
          return;
        }
        throw new Error('Could not extract enough text from PDF. The PDF may be image-based or empty.');
      }

      setProgress({ current: 1, total: 3, stage: 'Chunking text...' });

      // Chunk text
      console.log('Chunking text...');
      const chunks = chunkText(text, 2000);
      console.log('Created', chunks.length, 'chunks');
      
      if (chunks.length === 0) {
        throw new Error('No valid text chunks found in PDF');
      }

      setProgress({ current: 2, total: 3, stage: `Generating flashcards from ${chunks.length} sections...` });

      // Generate flashcards
      console.log('Generating flashcards...');
      const flashcards = await generateFlashcards(
        chunks,
        apiKey,
        (current, total) => {
          setProgress({
            current: 2,
            total: 3,
            stage: `Generating flashcards (${current}/${total} sections)...`
          });
        }
      );

      console.log('Generated', flashcards.length, 'flashcards');

      if (flashcards.length === 0) {
        throw new Error('No flashcards were generated from the PDF');
      }

      setProgress({ current: 3, total: 3, stage: `Created ${flashcards.length} flashcards!` });

      // Pass flashcards to parent
      setTimeout(() => {
        onFlashcardsGenerated(flashcards);
        setIsProcessing(false);
      }, 1000);

    } catch (err) {
      console.error('Error processing PDF:', err);
      setError(err.message || 'Failed to process PDF. Please try a different PDF file.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Welcome Header */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-4">
          Welcome to Mindful Study Deck
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Study smarter with flashcards that understand your focus, mood, and pace.
        </p>
      </div>

      {/* Feature Preview Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {/* Hand Gestures */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="text-5xl mb-4">👋</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Hand Gestures</h3>
          <p className="text-gray-600 text-sm">
            Navigate flashcards with simple hand gestures - swipe, thumbs up/down for instant feedback
          </p>
        </div>

        {/* Emotion Detection */}
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-2xl border-2 border-pink-200 hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="text-5xl mb-4">😊</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Emotion Detection</h3>
          <p className="text-gray-600 text-sm">
            AI detects frustration and adapts content difficulty to keep you in the optimal learning zone
          </p>
        </div>

        {/* Adaptive Learning */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200 hover:shadow-xl transition-all hover:-translate-y-1">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Adaptive Learning</h3>
          <p className="text-gray-600 text-sm">
            Spaced repetition algorithm prioritizes cards you need most, maximizing retention
          </p>
        </div>
      </div>

      {/* Gemini AI Ready Indicator */}
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 p-4 rounded-2xl mb-8 text-center border border-purple-200 shadow-sm">
  <div className="flex items-center justify-center gap-2">
    <div className="w-2.5 h-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse opacity-80"></div>
    <span className="text-lg font-semibold bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent">
      ✨ Mindfully Crafted for Smarter Learning ✨
    </span>
  </div>
  <p className="text-xs text-gray-600 mt-1">
    Adaptive flashcards powered by intelligent design — focused, fluid, and free.
  </p>
</div>


      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-4 border-dashed rounded-2xl p-12 text-center transition-all
          ${isDragging ? 'border-primary bg-primary/5 scale-105' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />

        {!isProcessing ? (
          <>
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Drop your PDF here
            </h3>
            <p className="text-sm text-gray-600">
              or click to browse your files
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                {progress.stage}
              </p>
              {progress.total > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
