import Card from '../../ui/Card'
import Button from '../../ui/Button'
import ChatSessionsStats from './ChatSessionsStats'
import SessionsList from './SessionsList'
// import MessageViewer from './MessageViewer' // Temporarily commented out
import useChatData from '@/hooks/admin/useChatData'

export default function ChatSessionsTab() {
  const { 
    sessions, 
    loading, 
    sessionMessages,
    messagesLoading,
    refreshData, 
    exportData, 
    messageViewOpen, 
    selectedSession, 
    viewSession,
    deleteSession,
    closeMessageViewer 
  } = useChatData()

  console.log('🏠 ChatSessionsTab rendering...')
  console.log('🏠 messageViewOpen:', messageViewOpen)
  console.log('🔍 Debug - sessions:', sessions, 'loading:', loading, 'sessions length:', sessions?.length)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg lg:text-2xl font-bold text-white mb-1 lg:mb-2">Chat Sessions</h2>
            <p className="text-sm lg:text-base text-white/70">Monitor user conversations with Harper</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={refreshData}
              variant="secondary"
              size="sm"
              className="text-xs lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2"
            >
              Refresh
            </Button>
            <Button
              onClick={exportData}
              variant="primary"
              size="sm"
              className="text-xs lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2"
            >
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <ChatSessionsStats />

      {/* Sessions List - NOW PASSING PROPER PROPS */}
      <SessionsList 
        sessions={sessions}
        loading={loading}
        viewSession={viewSession}
        deleteSession={deleteSession}
      />

      {/* Message Viewer Modal - RESPONSIVE VERSION */}
      {messageViewOpen && selectedSession && (
        <>
          {/* Backdrop */}
          <div 
            onClick={closeMessageViewer}
            className="fixed inset-0 bg-black/80 z-[2147483646]"
          />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl max-h-[90vh] bg-slate-800 text-white rounded-xl border border-white/10 z-[2147483647] shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 lg:p-5 border-b border-white/10 flex-shrink-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-white m-0">
                Session Messages
              </h2>
              <button 
                onClick={closeMessageViewer}
                className="bg-red-500 hover:bg-red-600 text-white px-3 lg:px-4 py-1.5 lg:py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 lg:p-6 overflow-auto flex-1">
              {/* Session Info */}
              <div className="bg-white/5 p-4 rounded-lg mb-5 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-2">
                  <div>
                    <div className="text-sm sm:text-base font-semibold mb-1 text-white">
                      ID: {selectedSession.id.substring(0, 8)}...
                    </div>
                    <div className="text-xs sm:text-sm text-white/70">
                      {new Date(selectedSession.session_started_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                    selectedSession.session_ended_at ? 'bg-gray-500' : 'bg-emerald-500'
                  }`}>
                    {selectedSession.session_ended_at ? 'Ended' : 'Active'}
                  </span>
                </div>
                
                {/* Metadata */}
                {selectedSession.metadata && Object.keys(selectedSession.metadata).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedSession.metadata.source && (
                      <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">
                        {selectedSession.metadata.source}
                      </span>
                    )}
                    {selectedSession.metadata.initial_query && (
                      <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs max-w-[150px] sm:max-w-xs truncate inline-block">
                        &quot;{selectedSession.metadata.initial_query}&quot;
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Messages Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm sm:text-base text-white font-medium m-0">
                    Messages ({sessionMessages?.length || 0})
                  </h4>
                  {messagesLoading && (
                    <div className="text-white/60 text-xs sm:text-sm">
                      Loading...
                    </div>
                  )}
                </div>

                {/* Message List */}
                {!sessionMessages || sessionMessages.length === 0 ? (
                  <div className="text-center py-10 px-5 text-white/60">
                    <p>No messages found for this session</p>
                    <p className="text-xs mt-2">
                      Check console for debug information
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[250px] sm:max-h-[300px] lg:max-h-[350px] overflow-auto pr-1 sm:pr-2">
                    <div className="flex flex-col gap-3">
                      {sessionMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 sm:p-4 rounded-lg border border-white/10 ${
                            message.sender === 'user'
                              ? 'bg-blue-500/10 ml-4 sm:ml-8'
                              : 'bg-purple-500/10 mr-4 sm:mr-8'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                                message.sender === 'user' ? 'bg-blue-500' : 'bg-purple-500'
                              }`}>
                                {message.sender === 'user' ? 'User' : 'Harper'}
                              </span>
                              {message.is_voice_input && (
                                <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs">
                                  🎤 Voice
                                </span>
                              )}
                            </div>
                            <span className="text-white/40 text-xs">
                              {new Date(message.message_timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          <p className="m-0 text-white text-sm leading-relaxed break-words">
                            {message.message_text}
                          </p>
                          
                          {/* Voice transcript */}
                          {message.voice_transcript && 
                           message.voice_transcript !== message.message_text && (
                            <div className="mt-2 p-2 bg-white/5 rounded text-xs">
                              <span className="text-white/60">
                                Transcript: 
                              </span>
                              <span className="text-white/80">
                                {message.voice_transcript}
                              </span>
                            </div>
                          )}
                          
                          {/* Selected voice */}
                          {message.selected_voice && (
                            <div className="mt-2">
                              <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">
                                Voice: {message.selected_voice}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Statistics */}
                {sessionMessages && sessionMessages.length > 0 && (
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 mt-4">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                      <div>
                        <p className="m-0 mb-1 text-white/60 text-xs">
                          Total
                        </p>
                        <p className="m-0 text-white font-semibold text-sm sm:text-base">
                          {sessionMessages.length}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 mb-1 text-white/60 text-xs">
                          User
                        </p>
                        <p className="m-0 text-blue-400 font-semibold text-sm sm:text-base">
                          {sessionMessages.filter(m => m.sender === 'user').length}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 mb-1 text-white/60 text-xs">
                          Harper
                        </p>
                        <p className="m-0 text-purple-400 font-semibold text-sm sm:text-base">
                          {sessionMessages.filter(m => m.sender === 'Harper').length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}