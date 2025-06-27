import { useState, useEffect } from 'react'

interface SessionModalProps {
  isOpen: boolean
  session?: any
  speakers: any[]
  onClose: () => void
  onSubmit: (sessionData: any) => Promise<void>
}

export default function SessionModal({ isOpen, session, speakers, onClose, onSubmit }: SessionModalProps) {
  const [form, setForm] = useState({
    time: '',
    title: '',
    speaker: '',
    description: '',
    location: ''
  })

  // Update form when session prop changes
  useEffect(() => {
    if (session) {
      setForm({
        time: session.time,
        title: session.title,
        speaker: session.speaker,
        description: session.description || '',
        location: session.location || ''
      })
    } else {
      setForm({ time: '', title: '', speaker: '', description: '', location: '' })
    }
  }, [session])

  const handleSubmit = async () => {
    if (!form.time || !form.title || !form.speaker) {
      alert('Please fill in all required fields')
      return
    }

    try {
      await onSubmit(form)
      onClose()
    } catch (error) {
      alert('Failed to save session')
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
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
        maxWidth: '600px',
        backgroundColor: '#1e293b',
        color: 'white',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 2147483647,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '20px', 
            fontWeight: '600'
          }}>
            {session ? 'Edit Session' : 'Add Session'}
          </h2>
          <button 
            onClick={onClose}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '14px', 
                marginBottom: '6px' 
              }}>
                Time *
              </label>
              <input
                type="text"
                value={form.time}
                onChange={(e) => setForm({...form, time: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
                placeholder="e.g., 9:00 AM - 10:00 AM"
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '14px', 
                marginBottom: '6px' 
              }}>
                Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({...form, title: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
                placeholder="Session title"
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '14px', 
                marginBottom: '6px' 
              }}>
                Speaker *
              </label>
              <select
                value={form.speaker}
                onChange={(e) => setForm({...form, speaker: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                <option value="" style={{backgroundColor: '#1e293b'}}>Select a speaker</option>
                {speakers.map((speaker) => (
                  <option key={speaker.id} value={speaker.name} style={{backgroundColor: '#1e293b'}}>
                    {speaker.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '14px', 
                marginBottom: '6px' 
              }}>
                Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({...form, location: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
                placeholder="Room or location"
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '14px', 
                marginBottom: '6px' 
              }}>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
                placeholder="Session description"
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px',
            marginTop: '24px'
          }}>
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {session ? 'Update' : 'Create'} Session
            </button>
          </div>
        </div>
      </div>
    </>
  )
}