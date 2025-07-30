import Card, { CardContent, CardHeader } from '../../ui/Card'
import Button from '../../ui/Button'
import { Speaker } from '@/lib/supabase/chatStorage'

interface SpeakersListProps {
  speakers: Speaker[]
  loading: boolean
  onAdd: () => void
  onEdit: (speaker: Speaker) => void
  onDelete: (speakerId: string) => void
}

export default function SpeakersList({ speakers, loading, onAdd, onEdit, onDelete }: SpeakersListProps) {
  const handleDelete = async (speaker: Speaker) => {
    if (confirm(`Delete speaker "${speaker.name}"?`)) {
      try {
        await onDelete(speaker.id)
      } catch (error) {
        alert('Failed to delete speaker')
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Speakers</h3>
          <Button onClick={onAdd} variant="primary" size="sm">
            Add Speaker
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : speakers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/60">No speakers added yet</p>
            <Button onClick={onAdd} variant="primary" className="mt-4">
              Add First Speaker
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {speakers.map((speaker) => (
              <div key={speaker.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">{speaker.name}</h4>
                    <p className="text-white/70 text-sm">{speaker.title} at {speaker.company}</p>
                    {speaker.bio && (
                      <p className="text-white/60 text-sm mt-2">{speaker.bio}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => onEdit(speaker)}
                      variant="secondary"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(speaker)}
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