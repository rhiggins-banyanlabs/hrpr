import Card from '../../ui/Card'
import ConnectionStatus from './ConnectionStatus'
import DataExport from './DataExport'
import DatabaseStats from './DatabaseStats'

export default function DatabaseTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Database Management</h2>
          <p className="text-white/70">Monitor database health, performance, and manage data exports</p>
        </div>
      </Card>

      {/* Database Stats */}
      <DatabaseStats />

      {/* Connection Status & Health Metrics */}
      <ConnectionStatus />

      {/* Data Export */}
      <DataExport />
    </div>
  )
}