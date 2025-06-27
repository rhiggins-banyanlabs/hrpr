import Card, { CardContent, CardHeader } from '../../ui/Card'
import Badge from '../../ui/Badge'
import useAnalytics from '@/hooks/admin/useAnalytics'

export default function RecentActivity() {
  const { analytics, loading } = useAnalytics()

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-white/10 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-12 bg-white/5 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Questions */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Recent Questions</h3>
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

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Recent Events</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recentEvents.length === 0 ? (
              <p className="text-white/60 text-center py-8">No recent events</p>
            ) : (
              analytics.recentEvents.map((event: any, index: number) => (
                <div key={index} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{event.type}</p>
                      <p className="text-white/60 text-xs">
                        {event.timestamp || new Date().toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="info">
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}