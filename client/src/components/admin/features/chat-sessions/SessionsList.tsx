import Card, { CardContent, CardHeader } from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
// REMOVED: import useChatData from '@/hooks/admin/useChatData'
import { formatDate, formatDuration } from '@/lib/utils/dateFormatters'
import { ChatSession } from '@/lib/supabase/chatStorage'

// Instead of using the hook here, we'll receive props from the parent
interface SessionsListProps {
  sessions?: ChatSession[]
  loading: boolean
  viewSession: (session: ChatSession) => void
  deleteSession: (sessionId: string) => void
}

export default function SessionsList({ 
  sessions = [], 
  loading, 
  viewSession, 
  deleteSession 
}: SessionsListProps) {
  // Simple test function
  const testModal = () => {
    alert('Button clicked! This proves the button works.')
    console.log('🧪 Test button clicked - this should show if JavaScript is working')
  }

  // Safety check for sessions
  if (!sessions || !Array.isArray(sessions)) {
    console.log('❌ Sessions is invalid:', sessions)
    return (
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Recent Chat Sessions</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-white/70">Loading sessions...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-white/10 rounded w-48 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10 animate-pulse">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="h-6 bg-white/10 rounded w-16"></div>
                    <div className="h-6 bg-white/10 rounded w-32"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-4 bg-white/10 rounded"></div>
                    <div className="h-4 bg-white/10 rounded"></div>
                  </div>
                  <div className="h-3 bg-white/10 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasNoSessions = sessions.length === 0

  if (hasNoSessions) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-white">Recent Chat Sessions</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-white/70">No chat sessions found</div>
            <Button onClick={testModal} variant="primary" className="mt-4">
              Test Button (Should Show Alert)
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displaySessions = sessions.slice(0, 10) // Show only first 10

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Recent Chat Sessions</h3>
          <Button onClick={testModal} variant="secondary" size="sm">
            Test Alert
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displaySessions.map((session) => (
            <div key={session.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Status and Session ID */}
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={session.session_ended_at ? 'default' : 'success'}>
                      {session.session_ended_at ? 'Ended' : 'Active'}
                    </Badge>
                    <span className="text-white/60 text-sm">
                      Session: {session.id.substring(0, 8)}...
                    </span>
                  </div>
                  
                  {/* Session Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white/60">Started:</p>
                      <p className="text-white">{formatDate(session.session_started_at)}</p>
                    </div>
                    {session.session_ended_at && (
                      <div>
                        <p className="text-white/60">Duration:</p>
                        <p className="text-white">
                          {formatDuration(session.session_started_at, session.session_ended_at)}
                        </p>
                      </div>
                    )}
                    {!session.session_ended_at && (
                      <div>
                        <p className="text-white/60">Status:</p>
                        <p className="text-green-400">Active Session</p>
                      </div>
                    )}
                  </div>
                  
                  {/* User Agent */}
                  {session.user_agent && (
                    <div className="mt-2">
                      <p className="text-white/60 text-xs">User Agent:</p>
                      <p className="text-white/70 text-xs truncate max-w-md">
                        {session.user_agent}
                      </p>
                    </div>
                  )}
                  
                  {/* Session Metadata */}
                  {session.metadata && Object.keys(session.metadata).length > 0 && (
                    <div className="mt-2">
                      <p className="text-white/60 text-xs">Session Info:</p>
                      <div className="text-white/70 text-xs flex flex-wrap gap-1 mt-1">
                        {session.metadata.source && (
                          <Badge variant="info" className="text-xs">
                            {session.metadata.source}
                          </Badge>
                        )}
                        {session.metadata.initial_query && (
                          <Badge variant="warning" className="text-xs">
                            &quot;{session.metadata.initial_query}&quot;
                          </Badge>
                        )}
                        {session.user_id && (
                          <Badge variant="success" className="text-xs">
                            User: {session.user_id.substring(0, 8)}...
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => {
                      console.log('🔥 View Messages button clicked for session:', session.id)
                      // Call the parent function passed as prop
                      viewSession(session)
                    }}
                    variant="primary"
                    size="sm"
                  >
                    View Messages
                  </Button>
                  <Button
                    onClick={() => deleteSession(session.id)}
                    variant="danger"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Show more indicator */}
          {sessions.length > 10 && (
            <div className="text-center py-4">
              <p className="text-white/60 text-sm">
                Showing 10 of {sessions.length} sessions
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}