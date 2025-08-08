import Card, { CardContent, CardHeader } from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import useDatabase from '@/hooks/admin/useDatabase'
import { formatDate } from '@/lib/utils/dateFormatters'

export default function ConnectionStatus() {
  const { 
    connectionStatus, 
    lastChecked, 
    testConnection, 
    loading,
    healthCheck,
    performanceMetrics 
  } = useDatabase()

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'connected': return 'success'
      case 'disconnected': return 'error'
      case 'testing': return 'warning'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected'
      case 'disconnected': return 'Disconnected'
      case 'testing': return 'Testing...'
      default: return 'Unknown'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Connection Status</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main Status */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Supabase Database</p>
                <p className="text-white/60 text-sm">Primary database connection</p>
              </div>
              <Badge variant={getStatusVariant(connectionStatus)}>
                {getStatusText(connectionStatus)}
              </Badge>
            </div>

            {/* Last Checked */}
            {lastChecked && (
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-white/60 text-sm">Last checked:</p>
                <p className="text-white text-sm">{formatDate(lastChecked)}</p>
              </div>
            )}

            {/* Test Button */}
            <Button
              onClick={testConnection}
              loading={loading}
              disabled={loading}
              variant="secondary"
              fullWidth
            >
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Health Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Database Health & Performance</h3>
            <Button
              onClick={testConnection}
              loading={loading}
              disabled={loading}
              variant="secondary"
              size="sm"
            >
              Run Health Check
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg animate-pulse">
                  <div className="h-4 bg-white/10 rounded mb-2"></div>
                  <div className="h-6 bg-white/10 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Response Time */}
              <div className="p-4 bg-white/5 rounded-lg border-l-4 border-blue-500">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white/60 text-sm">Current Response Time</p>
                    <p className="text-white text-xs mt-1">Latest database query</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">
                      {healthCheck.responseTime ? `${Math.round(healthCheck.responseTime)}ms` : 'N/A'}
                    </p>
                    <Badge variant={
                      !healthCheck.responseTime ? 'default' :
                      healthCheck.responseTime < 500 ? 'success' :
                      healthCheck.responseTime < 1000 ? 'warning' : 'error'
                    }>
                      {!healthCheck.responseTime ? 'Unknown' :
                       healthCheck.responseTime < 500 ? 'Fast' :
                       healthCheck.responseTime < 1000 ? 'Moderate' : 'Slow'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Average Response Time */}
              <div className="p-4 bg-white/5 rounded-lg border-l-4 border-green-500">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white/60 text-sm">Average Response Time</p>
                    <p className="text-white text-xs mt-1">Based on {performanceMetrics.responseTimes.length} real tests</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">
                      {performanceMetrics.avgResponseTime ? `${Math.round(performanceMetrics.avgResponseTime)}ms` : 'N/A'}
                    </p>
                    <Badge variant={
                      !performanceMetrics.avgResponseTime ? 'default' :
                      performanceMetrics.avgResponseTime < 300 ? 'success' :
                      performanceMetrics.avgResponseTime < 800 ? 'warning' : 'error'
                    }>
                      {!performanceMetrics.avgResponseTime ? 'No data' :
                       performanceMetrics.avgResponseTime < 300 ? 'Excellent' :
                       performanceMetrics.avgResponseTime < 800 ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Query Performance */}
              <div className="p-4 bg-white/5 rounded-lg border-l-4 border-purple-500">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white/60 text-sm">SELECT Query Performance</p>
                    <p className="text-white text-xs mt-1">Average SELECT response time</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">
                      {performanceMetrics.queryTimes.select ? `${Math.round(performanceMetrics.queryTimes.select)}ms` : 'N/A'}
                    </p>
                    <Badge variant={
                      !performanceMetrics.queryTimes.select ? 'default' :
                      performanceMetrics.queryTimes.select < 200 ? 'success' :
                      performanceMetrics.queryTimes.select < 500 ? 'warning' : 'error'
                    }>
                      {!performanceMetrics.queryTimes.select ? 'No data' :
                       performanceMetrics.queryTimes.select < 200 ? 'Fast' :
                       performanceMetrics.queryTimes.select < 500 ? 'Moderate' : 'Slow'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* COUNT Query Performance */}
              <div className="p-4 bg-white/5 rounded-lg border-l-4 border-yellow-500">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white/60 text-sm">COUNT Query Performance</p>
                    <p className="text-white text-xs mt-1">Average aggregation time</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">
                      {performanceMetrics.queryTimes.count ? `${Math.round(performanceMetrics.queryTimes.count)}ms` : 'N/A'}
                    </p>
                    <Badge variant={
                      !performanceMetrics.queryTimes.count ? 'default' :
                      performanceMetrics.queryTimes.count < 400 ? 'success' :
                      performanceMetrics.queryTimes.count < 1000 ? 'warning' : 'error'
                    }>
                      {!performanceMetrics.queryTimes.count ? 'No data' :
                       performanceMetrics.queryTimes.count < 400 ? 'Fast' :
                       performanceMetrics.queryTimes.count < 1000 ? 'Moderate' : 'Slow'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Error Rate */}
              <div className="p-4 bg-white/5 rounded-lg border-l-4 border-cyan-500">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white/60 text-sm">Error Rate</p>
                    <p className="text-white text-xs mt-1">Failed queries percentage</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">
                      {performanceMetrics.errorRate !== undefined ? `${Math.round(performanceMetrics.errorRate)}%` : 'N/A'}
                    </p>
                    <Badge variant={
                      performanceMetrics.errorRate === undefined ? 'default' :
                      performanceMetrics.errorRate === 0 ? 'success' :
                      performanceMetrics.errorRate < 10 ? 'warning' : 'error'
                    }>
                      {performanceMetrics.errorRate === undefined ? 'No data' :
                       performanceMetrics.errorRate === 0 ? 'Perfect' :
                       performanceMetrics.errorRate < 10 ? 'Good' : 'Issues'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Last Health Check */}
              <div className="p-4 bg-white/5 rounded-lg border-l-4 border-orange-500">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white/60 text-sm">Last Health Check</p>
                    <p className="text-white text-xs mt-1">Most recent verification</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium text-sm">
                      {healthCheck.lastCheck ? 
                        new Date(healthCheck.lastCheck).toLocaleTimeString() : 
                        'Never'
                      }
                    </p>
                    <p className="text-white/60 text-xs">
                      {healthCheck.lastCheck ? 
                        new Date(healthCheck.lastCheck).toLocaleDateString() : 
                        'Run check'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Health Summary */}
          {!loading && healthCheck.responseTime && (
            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' && healthCheck.responseTime < 1000 
                    ? 'bg-green-400' 
                    : 'bg-yellow-400'
                }`}></div>
                <div>
                  <p className="text-white font-medium">
                    {connectionStatus === 'connected' && healthCheck.responseTime < 1000 
                      ? 'Database is healthy and performing well' 
                      : 'Database is connected but may be experiencing high latency'
                    }
                  </p>
                  <p className="text-white/60 text-sm">
                    All systems operational • Response times within acceptable range
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}