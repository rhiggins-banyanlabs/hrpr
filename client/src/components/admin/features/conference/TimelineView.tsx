import Card, { CardContent, CardHeader } from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import useConferenceData from '@/hooks/admin/useConferenceData'
import useConferenceForms from '@/hooks/admin/useConferenceForms'

export default function TimelineView() {
  const { sessions, speakers, loading, groupSessionsByTime, getSpeakerById } = useConferenceData()
  const { editSession, deleteSession } = useConferenceForms()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-white/10 rounded w-48 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="h-8 bg-white/10 rounded w-24 animate-pulse"></div>
                <div className="h-32 bg-white/5 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const groupedSessions = groupSessionsByTime()
  const hasNoSessions = Object.keys(groupedSessions).length === 0

  if (hasNoSessions) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Conference Timeline</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-white/70 mb-4">No sessions scheduled yet</div>
            <Button onClick={() => useConferenceForms().openSessionForm()}>
              Add First Session
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-xl font-semibold text-white">Conference Timeline</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {Object.entries(groupedSessions).map(([time, timeSessions]) => (
            <div key={time} className="border-l-4 border-indigo-500 pl-6">
              {/* Time Header */}
              <div className="flex items-center mb-4">
                <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium -ml-8 bg-black">
                  {time}
                </div>
              </div>
              
              {/* Sessions for this time */}
              <div className="space-y-4">
                {timeSessions.map((session) => {
                  const speaker = getSpeakerById(session.speaker)
                  
                  return (
                    <div key={session.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white mb-2">{session.title}</h4>
                          
                          {/* Speaker Info */}
                          {speaker && (
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {speaker.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-medium">{speaker.name}</p>
                                <p className="text-white/60 text-sm">{speaker.title} • {speaker.company}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Description */}
                          <p className="text-white/70 text-sm mb-2">{session.description}</p>
                          
                          {/* Location Badge */}
                          {session.location && (
                            <Badge variant="info">
                              {session.location}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => editSession(session)}
                            variant="ghost"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => session.id && deleteSession(session.id)}
                            variant="danger"
                            size="sm"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}