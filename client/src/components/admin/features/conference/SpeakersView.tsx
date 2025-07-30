import Card, { CardContent, CardHeader } from '../../ui/Card'
import Button from '../../ui/Button'
import useConferenceData from '@/hooks/admin/useConferenceData'
import useConferenceForms from '@/hooks/admin/useConferenceForms'

export default function SpeakersView() {
  const { speakers, loading, getSessionsBySpeaker } = useConferenceData()
  const { editSpeaker, deleteSpeaker, openSpeakerForm } = useConferenceForms()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-white/10 rounded w-48 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-6 border border-white/10 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-white/10 rounded w-24"></div>
                    <div className="h-3 bg-white/10 rounded w-32"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-white/10 rounded"></div>
                  <div className="h-3 bg-white/10 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasNoSpeakers = speakers.length === 0

  if (hasNoSpeakers) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Conference Speakers</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-white/70 mb-4">No speakers added yet</div>
            <Button onClick={() => openSpeakerForm()}>
              Add First Speaker
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-xl font-semibold text-white">Conference Speakers</h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {speakers.map((speaker) => {
            const speakerSessions = getSessionsBySpeaker(speaker.id!)
            
            return (
              <div key={speaker.id} className="bg-white/5 rounded-lg p-6 border border-white/10">
                {/* Header with Avatar and Actions */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {speaker.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">{speaker.name}</h4>
                      <p className="text-white/60 text-sm">{speaker.title}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      onClick={() => editSpeaker(speaker)}
                      variant="ghost"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => speaker.id && deleteSpeaker(speaker.id)}
                      variant="danger"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                
                {/* Company */}
                <p className="text-white/80 text-sm mb-3">{speaker.company}</p>
                
                {/* Bio */}
                <p className="text-white/70 text-sm mb-4 line-clamp-3">{speaker.bio}</p>
                
                {/* Sessions */}
                {speakerSessions.length > 0 && (
                  <div>
                    <p className="text-white/60 text-xs mb-2">Speaking at:</p>
                    <div className="space-y-1">
                      {speakerSessions.map((session) => (
                        <div key={session.id} className="text-xs">
                          <span className="text-indigo-300">{session.time}</span>
                          <span className="text-white/70 ml-2">{session.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}