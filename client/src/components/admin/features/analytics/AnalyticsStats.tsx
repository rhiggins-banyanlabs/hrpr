import StatCard from '../../ui/StatCard'
import useAnalytics from '@/hooks/admin/useAnalytics'

export default function AnalyticsStats() {
  const { analytics, loading } = useAnalytics()

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
        value={analytics.avgSessionLength}
        icon={<div className="w-full h-full"></div>}
        iconColor="bg-yellow-500"
      />
      
      <StatCard
        title="Database Status"
        value={analytics.dbStatus}
        icon={<div className="w-full h-full"></div>}
        iconColor={analytics.dbStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}
      />
    </div>
  )
}