import StatCard from '../../ui/StatCard'
import useDatabase from '@/hooks/admin/useDatabase'

export default function DatabaseStats() {
  const { stats, loading, connectionStatus } = useDatabase()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 animate-pulse">
            <div className="h-4 bg-white/10 rounded mb-2"></div>
            <div className="h-8 bg-white/10 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Chat Sessions"
        value={stats.chatSessions}
        icon={<div className="w-full h-full"></div>}
        iconColor="bg-blue-500"
      />
      
      <StatCard
        title="Messages"
        value={stats.messages}
        icon={<div className="w-full h-full"></div>}
        iconColor="bg-green-500"
      />
      
      <StatCard
        title="Conference Sessions"
        value={stats.conferenceSessions}
        icon={<div className="w-full h-full"></div>}
        iconColor="bg-purple-500"
      />
      
      <StatCard
        title="Speakers"
        value={stats.speakers}
        icon={<div className="w-full h-full"></div>}
        iconColor="bg-yellow-500"
      />
    </div>
  )
}