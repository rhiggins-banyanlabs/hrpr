import AnalyticsStats from './AnalyticsStats'
import RecentActivity from './RecentActivity'

export default function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <AnalyticsStats />
      <RecentActivity />
    </div>
  )
}