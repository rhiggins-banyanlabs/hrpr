// Admin panel feedback analytics component

import React, { useState, useEffect } from 'react';
import { feedbackStorage } from '@/services/feedback-storage.service';
import { FeedbackSession } from '@/types/feedback.types';
import Card from '@/components/admin/ui/Card';
import StatCard from '@/components/admin/ui/StatCard';
import Badge from '@/components/admin/ui/Badge';

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

export const FeedbackAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<FeedbackAnalyticsData | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeedbackData();
  }, []);

  const loadFeedbackData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load analytics and recent feedback in parallel
      const [analyticsData, recentData] = await Promise.all([
        feedbackStorage.getFeedbackAnalytics(),
        feedbackStorage.getAllFeedback(50)
      ]);

      setAnalytics(analyticsData);
      setRecentFeedback(recentData);
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

  const getSatisfactionColor = (satisfied: boolean) => {
    return satisfied ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getSatisfactionText = (satisfied: boolean) => {
    return satisfied ? 'Satisfied' : 'Unsatisfied';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/50">Loading feedback analytics...</div>
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

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Feedback"
          value={analytics.totalFeedback}
          color="blue"
        />
        <StatCard
          title="Satisfaction Rate"
          value={`${analytics.satisfactionRate}%`}
          color={analytics.satisfactionRate >= 80 ? 'green' : analytics.satisfactionRate >= 60 ? 'yellow' : 'red'}
        />
        <StatCard
          title="Satisfied Users"
          value={analytics.satisfiedCount}
          color="green"
        />
        <StatCard
          title="Avg. Questions"
          value={analytics.averageConversations}
          color="purple"
        />
      </div>

      {/* Satisfaction Breakdown */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 text-white">Satisfaction Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-800">Satisfied Users</h4>
            <div className="text-2xl font-bold text-green-600">
              {analytics.satisfiedCount}
            </div>
            <div className="text-sm text-green-600">
              {analytics.totalFeedback > 0 
                ? `${Math.round((analytics.satisfiedCount / analytics.totalFeedback) * 100)}%`
                : '0%'
              } of total feedback
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-medium text-red-800">Unsatisfied Users</h4>
            <div className="text-2xl font-bold text-red-600">
              {analytics.unsatisfiedCount}
            </div>
            <div className="text-sm text-red-600">
              {analytics.totalFeedback > 0 
                ? `${Math.round((analytics.unsatisfiedCount / analytics.totalFeedback) * 100)}%`
                : '0%'
              } of total feedback
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Text Feedback */}
      {analytics.recentTextFeedback.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-white">Recent Text Feedback</h3>
          <div className="space-y-3">
            {analytics.recentTextFeedback.map((feedback, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700 mb-1">"{feedback.feedback_text}"</p>
                <p className="text-xs text-gray-500">
                  {formatDate(new Date(feedback.created_at))}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Feedback Sessions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">All Feedback Sessions</h3>
          <button
            onClick={loadFeedbackData}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
        
        {recentFeedback.length === 0 ? (
          <div className="text-center py-8 text-white/50">
            No feedback sessions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-white">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-2 text-white/70">Date</th>
                  <th className="text-left p-2 text-white/70">Session ID</th>
                  <th className="text-left p-2 text-white/70">Satisfaction</th>
                  <th className="text-left p-2 text-white/70">Questions</th>
                  <th className="text-left p-2 text-white/70">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {recentFeedback.map((session) => (
                  <tr key={session.sessionId} className="border-b border-white/10 hover:bg-white/5">
                    <td className="p-2 text-white/80">{formatDate(session.timestamp)}</td>
                    <td className="p-2 font-mono text-xs text-white/70">
                      {session.sessionId.substring(0, 8)}...
                    </td>
                    <td className="p-2">
                      <Badge className={getSatisfactionColor(session.satisfied)}>
                        {getSatisfactionText(session.satisfied)}
                      </Badge>
                    </td>
                    <td className="p-2 text-white/80">{session.conversationCount}</td>
                    <td className="p-2 max-w-xs text-white/80">
                      {session.feedbackText ? (
                        <div className="truncate text-white/80" title={session.feedbackText}>
                          {session.feedbackText}
                        </div>
                      ) : (
                        <span className="text-white/40">No text feedback</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};