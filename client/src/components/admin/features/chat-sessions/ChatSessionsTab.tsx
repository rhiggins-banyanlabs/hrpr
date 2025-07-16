import Card, { CardContent, CardHeader } from '../../ui/Card'
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
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Chat Sessions</h2>
            <p className="text-white/70">Monitor user conversations with Harper</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={refreshData}
              variant="secondary"
              size="md"
            >
              Refresh Data
            </Button>
            <Button
              onClick={exportData}
              variant="primary"
              size="md"
            >
              Export Data
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

      {/* Message Viewer Modal - WORKING VERSION */}
      {messageViewOpen && selectedSession && (
        <>
          {/* Backdrop */}
          <div 
            onClick={closeMessageViewer}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 2147483646
            }}
          />
          
          {/* Modal */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90vw',
            maxWidth: '900px',
            maxHeight: '85vh',
            backgroundColor: '#1e293b',
            color: 'white',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 2147483647,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '20px', 
                fontWeight: '600',
                color: 'white'
              }}>
                Chat Session Messages
              </h2>
              <button 
                onClick={closeMessageViewer}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
              >
                Close
              </button>
            </div>

            {/* Content */}
            <div style={{ 
              padding: '24px',
              overflow: 'auto',
              flex: 1
            }}>
              {/* Session Info */}
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      marginBottom: '4px',
                      color: 'white'
                    }}>
                      Session: {selectedSession.id.substring(0, 8)}...
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: 'rgba(255,255,255,0.7)'
                    }}>
                      Started: {new Date(selectedSession.session_started_at).toLocaleString()}
                    </div>
                  </div>
                  <span style={{
                    backgroundColor: selectedSession.session_ended_at ? '#6b7280' : '#10b981',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {selectedSession.session_ended_at ? 'Ended' : 'Active'}
                  </span>
                </div>
                
                {/* Metadata */}
                {selectedSession.metadata && Object.keys(selectedSession.metadata).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                    {selectedSession.metadata.source && (
                      <span style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px'
                      }}>
                        Source: {selectedSession.metadata.source}
                      </span>
                    )}
                    {selectedSession.metadata.initial_query && (
                      <span style={{
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px'
                      }}>
                        Query: "{selectedSession.metadata.initial_query}"
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Messages Section */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <h4 style={{ 
                    margin: 0,
                    color: 'white', 
                    fontWeight: '500',
                    fontSize: '16px'
                  }}>
                    Messages ({sessionMessages?.length || 0})
                  </h4>
                  {messagesLoading && (
                    <div style={{ 
                      color: 'rgba(255,255,255,0.6)', 
                      fontSize: '14px' 
                    }}>
                      Loading messages...
                    </div>
                  )}
                </div>

                {/* Message List */}
                {!sessionMessages || sessionMessages.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: 'rgba(255,255,255,0.6)'
                  }}>
                    <p>No messages found for this session</p>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                      Check console for debug information
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    maxHeight: '300px', 
                    overflow: 'auto',
                    paddingRight: '8px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {sessionMessages.map((message) => (
                        <div
                          key={message.id}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: message.sender === 'user'
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'rgba(147, 51, 234, 0.1)',
                            marginLeft: message.sender === 'user' ? '32px' : '0',
                            marginRight: message.sender === 'user' ? '0' : '32px'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                backgroundColor: message.sender === 'user' ? '#3b82f6' : '#a855f7',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}>
                                {message.sender === 'user' ? 'User' : 'Harper'}
                              </span>
                              {message.is_voice_input && (
                                <span style={{
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px'
                                }}>
                                  🎤 Voice
                                </span>
                              )}
                            </div>
                            <span style={{ 
                              color: 'rgba(255,255,255,0.4)', 
                              fontSize: '11px' 
                            }}>
                              {new Date(message.message_timestamp).toLocaleString()}
                            </span>
                          </div>
                          
                          <p style={{ 
                            margin: 0,
                            color: 'white', 
                            fontSize: '14px', 
                            lineHeight: '1.5'
                          }}>
                            {message.message_text}
                          </p>
                          
                          {/* Voice transcript */}
                          {message.voice_transcript && 
                           message.voice_transcript !== message.message_text && (
                            <div style={{ 
                              marginTop: '8px', 
                              padding: '8px', 
                              backgroundColor: 'rgba(255,255,255,0.05)', 
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                                Transcript: 
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                                {message.voice_transcript}
                              </span>
                            </div>
                          )}
                          
                          {/* Selected voice */}
                          {message.selected_voice && (
                            <div style={{ marginTop: '8px' }}>
                              <span style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px'
                              }}>
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
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    marginTop: '16px'
                  }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '16px',
                      textAlign: 'center'
                    }}>
                      <div>
                        <p style={{ 
                          margin: '0 0 4px 0',
                          color: 'rgba(255,255,255,0.6)', 
                          fontSize: '12px' 
                        }}>
                          Total Messages
                        </p>
                        <p style={{ 
                          margin: 0,
                          color: 'white', 
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          {sessionMessages.length}
                        </p>
                      </div>
                      <div>
                        <p style={{ 
                          margin: '0 0 4px 0',
                          color: 'rgba(255,255,255,0.6)', 
                          fontSize: '12px' 
                        }}>
                          User Messages
                        </p>
                        <p style={{ 
                          margin: 0,
                          color: '#60a5fa', 
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          {sessionMessages.filter(m => m.sender === 'user').length}
                        </p>
                      </div>
                      <div>
                        <p style={{ 
                          margin: '0 0 4px 0',
                          color: 'rgba(255,255,255,0.6)', 
                          fontSize: '12px' 
                        }}>
                          Harper Messages
                        </p>
                        <p style={{ 
                          margin: 0,
                          color: '#c084fc', 
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
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
      
      {/* Debug: Let's also add a test div that's always visible */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'green',
        color: 'white',
        padding: '10px',
        zIndex: 999999,
        fontSize: '12px'
      }}>
        ChatSessionsTab is rendered ✅<br/>
        Modal state: {messageViewOpen ? 'OPEN' : 'CLOSED'}<br/>
        Sessions: {sessions?.length || 0}
      </div>
    </div>
  )
}