import Card from '../../ui/Card'
import Button from '../../ui/Button'

interface ConferenceHeaderProps {
  onAddSpeaker: () => void
  onAddSession: () => void
  onRefresh: () => void
  onExport: () => void
}

export default function ConferenceHeader({ onAddSpeaker, onAddSession, onRefresh, onExport }: ConferenceHeaderProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Conference Agenda</h2>
          <p className="text-white/70">Manage speakers and sessions</p>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={onAddSpeaker} variant="primary" size="md">
            Add Speaker
          </Button>
          <Button onClick={onAddSession} variant="primary" size="md">
            Add Session
          </Button>
          <Button onClick={onRefresh} variant="secondary" size="md">
            Refresh
          </Button>
          <Button onClick={onExport} variant="secondary" size="md">
            Export
          </Button>
        </div>
      </div>
    </Card>
  )
}