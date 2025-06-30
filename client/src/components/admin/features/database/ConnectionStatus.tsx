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
    healthCheck 
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

      {/* Health Metrics */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Health Metrics</h3>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg animate-pulse">
                  <div className="h-4 bg-white/10 rounded mb-2"></div>
                  <div className="h-6 bg-white/10 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Response Time */}
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-white/60 text-sm">Response Time</p>
                  <p className="text-white font-medium">
                    {healthCheck.responseTime ? `${healthCheck.responseTime}ms` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Query Performance */}
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-white/60 text-sm">Query Performance</p>
                  <Badge variant={healthCheck.queryPerformance === 'good' ? 'success' : 'warning'}>
                    {healthCheck.queryPerformance || 'Unknown'}
                  </Badge>
                </div>
              </div>

              {/* Data Integrity */}
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-white/60 text-sm">Data Integrity</p>
                  <Badge variant={healthCheck.dataIntegrity ? 'success' : 'error'}>
                    {healthCheck.dataIntegrity ? 'Good' : 'Issues Detected'}
                  </Badge>
                </div>
              </div>

              {/* Last Health Check */}
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-white/60 text-sm">Health Check</p>
                  <p className="text-white text-sm">
                    {healthCheck.lastCheck ? formatDate(healthCheck.lastCheck) : 'Never'}
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