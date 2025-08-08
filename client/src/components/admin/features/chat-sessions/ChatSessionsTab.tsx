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
            width: '95vw',
            maxWidth: '900px',
            maxHeight: '90vh',
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
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: window.innerWidth < 640 ? '16px' : '20px', 
                fontWeight: '600',
                color: 'white'
              }}>
                Session Messages
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
                onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#ef4444'}
              >
                Close
              </button>
            </div>

            {/* Content */}
            <div style={{ 
              padding: window.innerWidth < 640 ? '16px' : '24px',
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
                  flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                  justifyContent: 'space-between', 
                  alignItems: window.innerWidth < 640 ? 'flex-start' : 'flex-start',
                  gap: window.innerWidth < 640 ? '8px' : '0',
                  marginBottom: '8px'
                }}>
                  <div>
                    <div style={{ 
                      fontSize: window.innerWidth < 640 ? '14px' : '16px', 
                      fontWeight: '600', 
                      marginBottom: '4px',
                      color: 'white'
                    }}>
                      ID: {selectedSession.id.substring(0, 8)}...
                    </div>
                    <div style={{ 
                      fontSize: window.innerWidth < 640 ? '12px' : '14px', 
                      color: 'rgba(255,255,255,0.7)'
                    }}>
                      {new Date(selectedSession.session_started_at).toLocaleString()}
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                    {selectedSession.metadata.source && (
                      <span style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        fontSize: window.innerWidth < 640 ? '10px' : '11px'
                      }}>
                        {selectedSession.metadata.source}
                      </span>
                    )}
                    {selectedSession.metadata.initial_query && (
                      <span style={{
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        fontSize: window.innerWidth < 640 ? '10px' : '11px',
                        maxWidth: window.innerWidth < 640 ? '200px' : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        &quot;{selectedSession.metadata.initial_query}&quot;
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
                    fontSize: window.innerWidth < 640 ? '14px' : '16px'
                  }}>
                    Messages ({sessionMessages?.length || 0})
                  </h4>
                  {messagesLoading && (
                    <div style={{ 
                      color: 'rgba(255,255,255,0.6)', 
                      fontSize: window.innerWidth < 640 ? '12px' : '14px' 
                    }}>
                      Loading...
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
                    maxHeight: window.innerWidth < 640 ? '250px' : '300px', 
                    overflow: 'auto',
                    paddingRight: window.innerWidth < 640 ? '4px' : '8px'
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
                            marginLeft: message.sender === 'user' ? (window.innerWidth < 640 ? '16px' : '32px') : '0',
                            marginRight: message.sender === 'user' ? '0' : (window.innerWidth < 640 ? '16px' : '32px')
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
                              fontSize: window.innerWidth < 640 ? '10px' : '11px' 
                            }}>
                              {new Date(message.message_timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          <p style={{ 
                            margin: 0,
                            color: 'white', 
                            fontSize: window.innerWidth < 640 ? '13px' : '14px', 
                            lineHeight: '1.5',
                            wordBreak: 'break-word'
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
                      gap: window.innerWidth < 640 ? '8px' : '16px',
                      textAlign: 'center'
                    }}>
                      <div>
                        <p style={{ 
                          margin: '0 0 4px 0',
                          color: 'rgba(255,255,255,0.6)', 
                          fontSize: window.innerWidth < 640 ? '11px' : '12px' 
                        }}>
                          Total
                        </p>
                        <p style={{ 
                          margin: 0,
                          color: 'white', 
                          fontWeight: '600',
                          fontSize: window.innerWidth < 640 ? '14px' : '16px'
                        }}>
                          {sessionMessages.length}
                        </p>
                      </div>
                      <div>
                        <p style={{ 
                          margin: '0 0 4px 0',
                          color: 'rgba(255,255,255,0.6)', 
                          fontSize: window.innerWidth < 640 ? '11px' : '12px' 
                        }}>
                          User
                        </p>
                        <p style={{ 
                          margin: 0,
                          color: '#60a5fa', 
                          fontWeight: '600',
                          fontSize: window.innerWidth < 640 ? '14px' : '16px'
                        }}>
                          {sessionMessages.filter(m => m.sender === 'user').length}
                        </p>
                      </div>
                      <div>
                        <p style={{ 
                          margin: '0 0 4px 0',
                          color: 'rgba(255,255,255,0.6)', 
                          fontSize: window.innerWidth < 640 ? '11px' : '12px' 
                        }}>
                          Harper
                        </p>
                        <p style={{ 
                          margin: 0,
                          color: '#c084fc', 
                          fontWeight: '600',
                          fontSize: window.innerWidth < 640 ? '14px' : '16px'
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
    </div>
  )
}