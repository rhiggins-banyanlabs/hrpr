import React, { useState, useEffect } from 'react';
import { feedbackStorage } from '@/services/feedback-storage.service';
import { FeedbackSession } from '@/types/feedback.types';
import Card, { CardContent, CardHeader } from '../../ui/Card';
import StatCard from '../../ui/StatCard';
import Badge from '../../ui/Badge';

interface FeedbackAnalyticsData {
  totalFeedback: number;
  satisfiedCount: number;
  unsatisfiedCount: number;
  satisfactionRate: number;
  averageConversations: number;
  recentTextFeedback: Array<{
    feedback_text: string;
    created_at: string;
  }>;
}

interface EnhancedFeedbackSession extends FeedbackSession {
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export const FeedbackAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<FeedbackAnalyticsData | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<EnhancedFeedbackSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadFeedbackData();
  }, []);

  const analyzeSentiment = (text: string | null | undefined): 'positive' | 'negative' | 'neutral' => {
    if (!text || text.trim().length === 0) return 'neutral';
    
    const lowerText = text.toLowerCase().trim();
    
    // Negative indicators (more comprehensive)
    const negativeWords = [
      'bad', 'poor', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'dislike',
      'unhelpful', 'confusing', 'frustrating', 'annoying', 'useless', 'wrong',
      'incorrect', 'broken', 'failed', 'disappointing', 'slow', 'difficult',
      'not helpful', 'didn\'t help', 'not useful', 'couldn\'t', 'didn\'t work',
      'needs improvement', 'could be better', 'not satisfied', 'unsatisfied',
      'no good', 'not good', 'stupid', 'dumb', 'waste', 'problem', 'issue',
      'error', 'bug', 'sucks', 'terrible', 'pathetic', 'lacking', 'insufficient'
    ];
    
    // Positive indicators (more comprehensive)
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'fantastic', 'wonderful', 'perfect',
      'helpful', 'useful', 'awesome', 'love', 'like', 'thanks', 'thank you',
      'clear', 'easy', 'fast', 'efficient', 'brilliant', 'impressed', 'satisfied',
      'well done', 'works great', 'very helpful', 'super', 'best', 'outstanding',
      'phenomenal', 'incredible', 'superb', 'delighted', 'pleased', 'happy',
      'appreciate', 'grateful', 'nice work', 'well designed', 'smooth', 'intuitive'
    ];
    
    // Weight longer phrases more heavily
    let negativeScore = 0;
    let positiveScore = 0;
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) {
        negativeScore += word.split(' ').length; // Multi-word phrases get more weight
      }
    });
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) {
        positiveScore += word.split(' ').length; // Multi-word phrases get more weight
      }
    });
    
    // Debug logging for sentiment analysis
    console.log(`🔍 Analyzing sentiment for: "${text}"`);
    console.log(`📊 Scores - Negative: ${negativeScore}, Positive: ${positiveScore}`);
    
    // If any sentiment words are found, classify based on which is higher
    // No threshold needed - any clear sentiment should be classified
    if (negativeScore > positiveScore && negativeScore > 0) {
      console.log(`❌ Result: NEGATIVE`);
      return 'negative';
    }
    if (positiveScore > negativeScore && positiveScore > 0) {
      console.log(`✅ Result: POSITIVE`);
      return 'positive';
    }
    
    // Only return neutral if no sentiment words found or scores are equal
    console.log(`⚪ Result: NEUTRAL`);
    return 'neutral';
  };

  const loadFeedbackData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsData, recentData] = await Promise.all([
        feedbackStorage.getFeedbackAnalytics(),
        feedbackStorage.getAllFeedback(100)
      ]);

      setAnalytics(analyticsData);
      
      // Enhance feedback with sentiment analysis
      const enhancedFeedback = recentData.map(session => {
        // First analyze the text sentiment
        const textSentiment = analyzeSentiment(session.feedbackText);
        
        // If text sentiment is clear (not neutral), prioritize it
        // Otherwise, use the satisfaction button as fallback
        let finalSentiment: 'positive' | 'negative' | 'neutral';
        
        if (textSentiment !== 'neutral') {
          // Text has clear sentiment, use it
          finalSentiment = textSentiment;
        } else if (session.satisfied === false) {
          // No clear text sentiment, but user clicked unsatisfied
          finalSentiment = 'negative';
        } else if (session.satisfied === true) {
          // No clear text sentiment, but user clicked satisfied
          finalSentiment = 'positive';
        } else {
          // No text feedback and no satisfaction rating
          finalSentiment = 'neutral';
        }
        
        return {
          ...session,
          sentiment: finalSentiment
        };
      });
      
      setRecentFeedback(enhancedFeedback);
    } catch (err) {
      setError('Failed to load feedback data');
      console.error('Error loading feedback data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getSentimentBadge = (session: EnhancedFeedbackSession) => {
    if (session.satisfied === false) {
      return <Badge variant="error">Negative</Badge>;
    }
    
    if (session.sentiment === 'negative') {
      return <Badge variant="error">Negative</Badge>;
    } else if (session.sentiment === 'positive') {
      return <Badge variant="success">Positive</Badge>;
    } else {
      return <Badge variant="info">Neutral</Badge>;
    }
  };

  const filteredFeedback = recentFeedback.filter(session => {
    if (filter === 'all') return true;
    if (filter === 'positive') return session.satisfied === true || session.sentiment === 'positive';
    if (filter === 'negative') return session.satisfied === false || session.sentiment === 'negative';
    return true;
  });

  const handleDeleteFeedback = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    setDeletingId(sessionId);
    try {
      const success = await feedbackStorage.deleteFeedback(sessionId);
      if (success) {
        // Refresh the data after deletion
        await loadFeedbackData();
      } else {
        alert('Failed to delete feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('An error occurred while deleting feedback.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select feedback to delete.');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} feedback item(s)?`)) {
      return;
    }

    try {
      const sessionIdsArray = Array.from(selectedIds);
      const success = await feedbackStorage.deleteMultipleFeedback(sessionIdsArray);
      if (success) {
        setSelectedIds(new Set());
        await loadFeedbackData();
      } else {
        alert('Failed to delete feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting multiple feedback:', error);
      alert('An error occurred while deleting feedback.');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFeedback.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFeedback.map(f => f.sessionId)));
    }
  };

  const toggleSelect = (sessionId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedIds(newSelected);
  };

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-3 lg:p-6 border border-white/10 animate-pulse">
              <div className="h-3 lg:h-4 bg-white/10 rounded mb-2"></div>
              <div className="h-6 lg:h-8 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/50">No feedback data available</div>
      </div>
    );
  }

  // Filter based on final sentiment only (not satisfaction button)
  // This ensures no overlap between positive and negative highlights
  const negativeWithText = recentFeedback.filter(f => 
    f.sentiment === 'negative' && f.feedbackText
  );
  
  const positiveWithText = recentFeedback.filter(f => 
    f.sentiment === 'positive' && f.feedbackText
  );
  
  // Debug logging for highlights sections  
  console.log(`\n🎨 HIGHLIGHTS DEBUG:`);
  console.log(`Negative items (Areas for Improvement): ${negativeWithText.length}`);
  negativeWithText.forEach((f, i) => console.log(`  ❌ ${i+1}. "${f.feedbackText}" (sentiment: ${f.sentiment})`));
  console.log(`Positive items (Positive Highlights): ${positiveWithText.length}`);
  positiveWithText.forEach((f, i) => console.log(`  ✅ ${i+1}. "${f.feedbackText}" (sentiment: ${f.sentiment})`));

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <StatCard
          title="Total Feedback"
          value={analytics.totalFeedback}
          icon={<div className="w-full h-full"></div>}
          iconColor="bg-blue-500"
        />
        
        <StatCard
          title="Satisfaction Rate"
          value={`${analytics.satisfactionRate}%`}
          icon={<div className="w-full h-full"></div>}
          iconColor={
            analytics.satisfactionRate >= 80 ? 'bg-green-500' : 
            analytics.satisfactionRate >= 60 ? 'bg-yellow-500' : 
            'bg-red-500'
          }
        />
        
        <StatCard
          title="Positive Feedback"
          value={analytics.satisfiedCount}
          icon={<div className="w-full h-full"></div>}
          iconColor="bg-green-500"
        />
        
        <StatCard
          title="Negative Feedback"
          value={analytics.unsatisfiedCount}
          icon={<div className="w-full h-full"></div>}
          iconColor="bg-red-500"
        />
      </div>

      {/* Feedback Highlights */}
      {(negativeWithText.length > 0 || positiveWithText.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6">
          {/* Negative Feedback Highlights */}
          {negativeWithText.length > 0 && (
            <Card className="p-3 lg:p-4">
              <CardHeader>
                <h3 className="text-base lg:text-xl font-semibold text-white">Areas for Improvement</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 lg:space-y-3">
                  {negativeWithText.slice(0, 3).map((feedback, index) => (
                    <div key={index} className="p-2 lg:p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-white/80 text-xs lg:text-sm mb-1 lg:mb-2">"{feedback.feedbackText}"</p>
                      <p className="text-white/40 text-xs">
                        {formatDate(feedback.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Positive Feedback Highlights */}
          {positiveWithText.length > 0 && (
            <Card className="p-3 lg:p-4">
              <CardHeader>
                <h3 className="text-base lg:text-xl font-semibold text-white">Positive Highlights</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 lg:space-y-3">
                  {positiveWithText.slice(0, 3).map((feedback, index) => (
                    <div key={index} className="p-2 lg:p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-white/80 text-sm mb-2">"{feedback.feedbackText}"</p>
                      <p className="text-white/40 text-xs">
                        {formatDate(feedback.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* All Feedback Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">All Feedback Sessions</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className={`px-3 py-1.5 text-white text-sm rounded-lg transition-colors ${
                  selectedIds.size > 0 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gray-500 opacity-50 cursor-not-allowed'
                }`}
              >
                Delete Selected {selectedIds.size > 0 && `(${selectedIds.size})`}
              </button>
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    filter === 'all' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('positive')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    filter === 'positive' 
                      ? 'bg-green-500 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Positive
                </button>
                <button
                  onClick={() => setFilter('negative')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    filter === 'negative' 
                      ? 'bg-red-500 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Negative
                </button>
              </div>
              <button
                onClick={loadFeedbackData}
                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredFeedback.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              No {filter !== 'all' ? filter : ''} feedback sessions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-white/70">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredFeedback.length && filteredFeedback.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-400"
                      />
                    </th>
                    <th className="text-left p-3 text-white/70">Date</th>
                    <th className="text-left p-3 text-white/70">Session ID</th>
                    <th className="text-left p-3 text-white/70">Sentiment</th>
                    <th className="text-left p-3 text-white/70">Questions</th>
                    <th className="text-left p-3 text-white/70">Feedback</th>
                    <th className="text-left p-3 text-white/70">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedback.map((session) => (
                    <tr key={session.sessionId} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(session.sessionId)}
                          onChange={() => toggleSelect(session.sessionId)}
                          className="rounded border-gray-400"
                        />
                      </td>
                      <td className="p-3 text-white/80">{formatDate(session.timestamp)}</td>
                      <td className="p-3 font-mono text-xs text-white/60">
                        {session.sessionId.substring(0, 8)}...
                      </td>
                      <td className="p-3">
                        {getSentimentBadge(session)}
                      </td>
                      <td className="p-3 text-white/80">{session.conversationCount}</td>
                      <td className="p-3 max-w-md">
                        {session.feedbackText ? (
                          <div className="text-white/80 line-clamp-2" title={session.feedbackText}>
                            {session.feedbackText}
                          </div>
                        ) : (
                          <span className="text-white/40 italic">No text feedback</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteFeedback(session.sessionId)}
                          disabled={deletingId === session.sessionId}
                          className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === session.sessionId ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};