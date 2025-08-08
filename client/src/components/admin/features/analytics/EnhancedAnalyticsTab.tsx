import React, { useState, useEffect } from 'react';
import { conferenceAnalyticsService, ConferenceAnalytics } from '@/lib/services/conferenceAnalyticsService';
import Card, { CardContent, CardHeader } from '../../ui/Card';
import StatCard from '../../ui/StatCard';
import Badge from '../../ui/Badge';

export default function EnhancedAnalyticsTab() {
  const [analytics, setAnalytics] = useState<ConferenceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await conferenceAnalyticsService.getConferenceAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 animate-pulse">
              <div className="h-4 bg-white/10 rounded mb-2"></div>
              <div className="h-8 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Error: {error || 'No analytics data available'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Conference Analytics</h2>
            <div className="flex items-center gap-2">
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('overview')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'overview' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'detailed' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Detailed
                </button>
              </div>
              <button
                onClick={loadAnalytics}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={analytics.totalUsers}
          icon={<div className="w-full h-full"></div>}
          iconColor="bg-blue-500"
        />
        
        <StatCard
          title="Total Messages"
          value={analytics.totalMessages}
          icon={<div className="w-full h-full"></div>}
          iconColor="bg-green-500"
        />
        
        <StatCard
          title="Avg Session Length"
          value={`${analytics.avgSessionLength} msgs`}
          icon={<div className="w-full h-full"></div>}
          iconColor="bg-yellow-500"
        />
        
        <StatCard
          title="Active Now"
          value={analytics.activeUsersNow}
          icon={<div className="w-full h-full"></div>}
          iconColor="bg-red-500"
        />
      </div>

      {/* Today's Stats */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Today's Activity</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-white/60 text-sm">Messages</div>
              <div className="text-2xl font-bold text-white">{analytics.todayStats.messages}</div>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-white/60 text-sm">Users</div>
              <div className="text-2xl font-bold text-white">{analytics.todayStats.users}</div>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-white/60 text-sm">Sessions</div>
              <div className="text-2xl font-bold text-white">{analytics.todayStats.sessions}</div>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-white/60 text-sm">Avg Length</div>
              <div className="text-2xl font-bold text-white">{analytics.todayStats.avgLength}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Questions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Most Asked Questions */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-white">Top 5 Most Asked Questions</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topQuestions.length === 0 ? (
                <p className="text-white/60 text-center py-8">No frequent questions yet</p>
              ) : (
                analytics.topQuestions.map((item, index) => (
                  <div key={index} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="info">#{index + 1}</Badge>
                      <Badge variant="success">{item.count}x</Badge>
                    </div>
                    <p className="text-white/80 text-sm mb-1">{item.question}</p>
                    <p className="text-white/40 text-xs">
                      Last asked: {formatTime(item.lastAsked)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Questions */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-white">Recent 10 Questions</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentQuestions.length === 0 ? (
                <p className="text-white/60 text-center py-8">No recent questions</p>
              ) : (
                analytics.recentQuestions.map((question: string, index: number) => (
                  <div key={index} className="p-3 bg-white/5 rounded-lg">
                    <p className="text-white/80 text-sm">{question}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Topics */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Popular Topics</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.popularTopics.map((topic, index) => (
              <div key={index} className="bg-white/5 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">{topic.topic}</h4>
                  <Badge variant={
                    topic.category === 'schedule' ? 'success' :
                    topic.category === 'location' ? 'info' :
                    topic.category === 'speaker' ? 'warning' : 'default'
                  }>
                    {topic.category}
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-white">{topic.count}</div>
                <div className="text-white/60 text-sm">questions</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {viewMode === 'detailed' && (
        <>
          {/* Intent Distribution */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-white">Query Intent Distribution</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.intentDistribution.map((intent, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-white">{intent.intent}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${intent.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-white/60 text-sm w-12 text-right">
                        {intent.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Peak Usage Hours */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-white">Peak Usage Hours (Last 7 Days)</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {analytics.peakUsageHours.map((hour, index) => (
                  <div key={index} className="text-center">
                    <div className="text-white/60 text-xs mb-1">{hour.hour}</div>
                    <div 
                      className="bg-blue-500/20 rounded w-full flex items-end justify-center relative"
                      style={{ height: '60px' }}
                    >
                      <div 
                        className="bg-blue-500 w-full rounded transition-all"
                        style={{ 
                          height: `${Math.max(10, (hour.messageCount / Math.max(...analytics.peakUsageHours.map(h => h.messageCount))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-white text-xs mt-1">{hour.messageCount}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Usage Trends */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-white">Daily Usage Trends (Last 14 Days)</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.dailyUsageTrends.map((day, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <div className="text-white font-medium">{formatDate(day.date)}</div>
                      <div className="text-white/60 text-sm">
                        {day.userCount} users • Avg {day.avgSessionLength} msgs/session
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{day.messageCount}</div>
                      <div className="text-white/60 text-sm">messages</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}