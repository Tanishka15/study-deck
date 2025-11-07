import React from 'react';
import { calculateDifficulty } from '../utils/spacedRepetition';

export default function Dashboard({ cards, sessionStats }) {
  if (!cards || cards.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Session Dashboard</h2>
        <p className="text-gray-600">Upload a PDF to start studying!</p>
      </div>
    );
  }

  // Calculate statistics
  const totalCards = cards.length;
  const reviewedCards = cards.filter(c => c.timesReviewed > 0).length;
  const masteredCards = cards.filter(c => c.timesCorrect > c.timesIncorrect && c.timesReviewed >= 3).length;
  const needsReviewCards = cards.filter(c => c.markedAsNeedsReview).length;
  const understoodCards = cards.filter(c => c.markedAsUnderstood).length;

  const avgDifficulty = cards.reduce((sum, card) => sum + calculateDifficulty(card), 0) / totalCards;
  const totalReviews = cards.reduce((sum, card) => sum + card.timesReviewed, 0);
  const totalCorrect = cards.reduce((sum, card) => sum + card.timesCorrect, 0);
  const accuracy = totalReviews > 0 ? (totalCorrect / totalReviews * 100) : 0;

  // Difficulty distribution
  const easyCards = cards.filter(c => calculateDifficulty(c) < 4).length;
  const mediumCards = cards.filter(c => {
    const diff = calculateDifficulty(c);
    return diff >= 4 && diff < 7;
  }).length;
  const hardCards = cards.filter(c => calculateDifficulty(c) >= 7).length;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Session Dashboard</h2>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-900">{totalCards}</div>
          <div className="text-sm text-blue-700">Total Cards</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-900">{reviewedCards}</div>
          <div className="text-sm text-green-700">Reviewed</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-purple-900">{masteredCards}</div>
          <div className="text-sm text-purple-700">Mastered</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="text-3xl font-bold text-orange-900">{accuracy.toFixed(0)}%</div>
          <div className="text-sm text-orange-700">Accuracy</div>
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Difficulty Distribution</h3>
        <div className="flex gap-2 h-8">
          {easyCards > 0 && (
            <div
              className="bg-green-500 rounded flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(easyCards / totalCards) * 100}%` }}
            >
              {easyCards} Easy
            </div>
          )}
          {mediumCards > 0 && (
            <div
              className="bg-yellow-500 rounded flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(mediumCards / totalCards) * 100}%` }}
            >
              {mediumCards} Medium
            </div>
          )}
          {hardCards > 0 && (
            <div
              className="bg-red-500 rounded flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(hardCards / totalCards) * 100}%` }}
            >
              {hardCards} Hard
            </div>
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Easier</span>
          <span>Avg: {avgDifficulty.toFixed(1)}/10</span>
          <span>Harder</span>
        </div>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Marked for Review</div>
          <div className="text-2xl font-bold text-gray-900">{needsReviewCards}</div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Marked as Understood</div>
          <div className="text-2xl font-bold text-gray-900">{understoodCards}</div>
        </div>
      </div>

      {/* Session Statistics */}
      {sessionStats && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Session Activity</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Study Duration:</span>
              <span className="ml-2 font-medium">{sessionStats.duration || '0m'}</span>
            </div>
            <div>
              <span className="text-gray-600">Cards Reviewed:</span>
              <span className="ml-2 font-medium">{totalReviews}</span>
            </div>
            <div>
              <span className="text-gray-600">Gestures Used:</span>
              <span className="ml-2 font-medium">{sessionStats.gesturesUsed || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Breaks Taken:</span>
              <span className="ml-2 font-medium">{sessionStats.breaksTaken || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Avg Emotion:</span>
              <span className="ml-2 font-medium">{sessionStats.avgEmotion || 'Neutral'}</span>
            </div>
            <div>
              <span className="text-gray-600">Frustration Events:</span>
              <span className="ml-2 font-medium">{sessionStats.frustrationEvents || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
