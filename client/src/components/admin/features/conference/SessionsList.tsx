import Card, { CardContent, CardHeader } from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'

interface SessionsListProps {
  sessions: any[]
  loading: boolean
  onAdd: () => void
  onEdit: (session: any) => void
  onDelete: (sessionId: string) => void
}

export default function SessionsList({ sessions, loading, onAdd, onEdit, onDelete }: SessionsListProps) {
  const handleDelete = async (session: any) => {
    if (confirm(`Delete session "${session.title}"?`)) {
      try {
        await onDelete(session.id)
      } catch (error) {
        alert('Failed to delete session')
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Sessions</h3>
          <Button onClick={onAdd} variant="primary" size="sm">
            Add Session
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/60">No sessions scheduled yet</p>
            <Button onClick={onAdd} variant="primary" className="mt-4">
              Add First Session
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="info">{session.time}</Badge>
                      {session.location && (
                        <Badge variant="warning">{session.location}</Badge>
                      )}
                    </div>
                    <h4 className="text-white font-semibold">{session.title}</h4>
                    <p className="text-white/70 text-sm">Speaker: {session.speaker}</p>
                    {session.description && (
                      <p className="text-white/60 text-sm mt-2">{session.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => onEdit(session)}
                      variant="secondary"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(session)}
                      variant="danger"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}