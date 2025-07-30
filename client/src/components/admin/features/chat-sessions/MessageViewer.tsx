import { useEffect } from 'react'
import Modal from '../../ui/Modal'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import useChatData from '@/hooks/admin/useChatData'
import { formatDate } from '@/lib/utils/dateFormatters'


export default function MessageViewer() {
  const { 
    messageViewOpen, 
    selectedSession, 
    sessionMessages, 
    messagesLoading,
    closeMessageViewer 
  } = useChatData()

  // Debug logging
  useEffect(() => {
    console.log('📱 MessageViewer - messageViewOpen:', messageViewOpen)
    console.log('📱 MessageViewer - selectedSession:', selectedSession?.id)
    console.log('📱 MessageViewer - sessionMessages:', sessionMessages.length)
  }, [messageViewOpen, selectedSession, sessionMessages])

  if (!messageViewOpen || !selectedSession) {
    return null
  }

  const HarperMessages = sessionMessages.filter(m => m.sender === 'Harper').length
  const userMessages = sessionMessages.filter(m => m.sender === 'user').length

  return (
    <Modal
      isOpen={messageViewOpen}
      onClose={closeMessageViewer}
      size="xl"
    >
      <div className="space-y-4">
        {/* Session Header */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Session: {selectedSession.id.substring(0, 8)}...
              </h3>
              <p className="text-white/60 text-sm">
                Started: {formatDate(selectedSession.session_started_at)}
              </p>
            </div>
            <Badge variant={selectedSession.session_ended_at ? 'default' : 'success'}>
              {selectedSession.session_ended_at ? 'Ended' : 'Active'}
            </Badge>
          </div>
          
          {/* Session Metadata */}
          {selectedSession.metadata && Object.keys(selectedSession.metadata).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedSession.metadata.source && (
                <Badge variant="info" className="text-xs">
                  Source: {selectedSession.metadata.source}
                </Badge>
              )}
              {selectedSession.metadata.initial_query && (
                <Badge variant="warning" className="text-xs">
                  Query: &quot;{selectedSession.metadata.initial_query}&quot;
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-white font-medium">Messages ({sessionMessages.length})</h4>
            {messagesLoading && (
              <div className="text-white/60 text-sm">Loading messages...</div>
            )}
          </div>

          {sessionMessages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60">No messages found for this session</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {sessionMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg border ${
                    message.sender === 'user'
                      ? 'bg-blue-500/10 border-blue-500/20 ml-8'
                      : 'bg-purple-500/10 border-purple-500/20 mr-8'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={message.sender === 'user' ? 'info' : 'warning'}
                        className="text-xs"
                      >
                        {message.sender === 'user' ? 'User' : 'Harper'}
                      </Badge>
                      {message.is_voice_input && (
                        <Badge variant="success" className="text-xs">
                          🎤 Voice
                        </Badge>
                      )}
                    </div>
                    <span className="text-white/40 text-xs">
                      {formatDate(message.message_timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-white text-sm leading-relaxed">
                    {message.message_text}
                  </p>
                  
                  {/* Voice transcript if different from message text */}
                  {message.voice_transcript && 
                   message.voice_transcript !== message.message_text && (
                    <div className="mt-2 p-2 bg-white/5 rounded text-xs">
                      <span className="text-white/60">Transcript: </span>
                      <span className="text-white/80">{message.voice_transcript}</span>
                    </div>
                  )}
                  
                  {/* Selected voice info */}
                  {message.selected_voice && (
                    <div className="mt-1">
                      <Badge variant="info" className="text-xs">
                        Voice: {message.selected_voice}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Statistics */}
        {sessionMessages.length > 0 && (
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-white/60 text-xs">Total Messages</p>
                <p className="text-white font-semibold">{sessionMessages.length}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">User Messages</p>
                <p className="text-blue-400 font-semibold">{userMessages}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Harper Messages</p>
                <p className="text-purple-400 font-semibold">{HarperMessages}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          onClick={closeMessageViewer}
          variant="secondary"
        >
          Close
        </Button>
      </div>
    </Modal>
  )
}