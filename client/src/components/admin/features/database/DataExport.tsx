import { useState } from 'react'
import Card, { CardContent, CardHeader } from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import { FormSelect } from '../../ui/FormInput'
import useDatabase from '@/hooks/admin/useDatabase'

type ExportFormat = 'json' | 'csv'
type ExportType = 'all' | 'chat_sessions' | 'messages' | 'conference' | 'analytics'

export default function DataExport() {
  const { exportData, loading } = useDatabase()
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [exportType, setExportType] = useState<ExportType>('all')

  const formatOptions = [
    { value: 'json', label: 'JSON' },
    { value: 'csv', label: 'CSV' }
  ]

  const typeOptions = [
    { value: 'all', label: 'All Data' },
    { value: 'chat_sessions', label: 'Chat Sessions Only' },
    { value: 'messages', label: 'Messages Only' },
    { value: 'conference', label: 'Conference Data Only' },
    { value: 'analytics', label: 'Analytics Only' }
  ]

  const handleExport = async () => {
    await exportData(exportType, exportFormat)
  }

  const getExportDescription = (type: ExportType) => {
    switch (type) {
      case 'all':
        return 'Export complete database including chat sessions, messages, conference data, and analytics'
      case 'chat_sessions':
        return 'Export chat session metadata without individual messages'
      case 'messages':
        return 'Export all chat messages with session references'
      case 'conference':
        return 'Export conference sessions and speaker information'
      case 'analytics':
        return 'Export analytics events and tracking data'
      default:
        return 'Select export type for description'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Data Export</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Export Type */}
            <FormSelect
              label="Export Type"
              value={exportType}
              onChange={(e) => setExportType(e.target.value as ExportType)}
              options={typeOptions}
            />

            {/* Export Format */}
            <FormSelect
              label="Format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              options={formatOptions}
            />

            {/* Description */}
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white/60 text-sm mb-2">Export Description:</p>
              <p className="text-white text-sm">{getExportDescription(exportType)}</p>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              loading={loading}
              disabled={loading}
              variant="primary"
              fullWidth
            >
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pre-configured Export Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium text-sm">Conference Agenda</p>
                  <p className="text-white/60 text-xs">Sessions & speakers</p>
                </div>
                <Button
                  onClick={() => exportData('conference', 'json')}
                  loading={loading}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                >
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium text-sm">Chat Data</p>
                  <p className="text-white/60 text-xs">Sessions & messages</p>
                </div>
                <Button
                  onClick={() => exportData('chat_sessions', 'json')}
                  loading={loading}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                >
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium text-sm">Analytics</p>
                  <p className="text-white/60 text-xs">Usage tracking data</p>
                </div>
                <Button
                  onClick={() => exportData('analytics', 'json')}
                  loading={loading}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                >
                  Export
                </Button>
              </div>
            </div>

            {/* Data Refresh */}
            <div className="pt-4 border-t border-white/10">
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
                fullWidth
              >
                Refresh All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}