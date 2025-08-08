import StatCard from '../../ui/StatCard'
import useChatData from '../../../../hooks/admin/useChatData'

export default function ChatSessionsStats() {
  const { sessions, analytics, loading } = useChatData()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 animate-pulse">
            <div className="h-4 bg-white/10 rounded mb-2"></div>
            <div className="h-8 bg-white/10 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  const activeSessions = sessions.filter(session => !session.session_ended_at)
  const totalSessions = sessions.length
  const totalAnalytics = analytics.length

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title="Total Sessions"
        value={totalSessions}
        icon={<div className="w-full h-full"></div>}
        iconColor="bg-blue-500"
      />
      
      <StatCard
        title="Active Sessions"
        value={activeSessions.length}
        icon={<div className="w-full h-full"></div>}
        iconColor="bg-green-500"
      />
      
      <StatCard
        title="Analytics Events"
        value={totalAnalytics}
        icon={<div className="w-full h-full"></div>}
        iconColor="bg-purple-500"
      />
    </div>
  )
}