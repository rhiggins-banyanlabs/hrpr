import { useState, useEffect } from 'react'
import { Speaker } from '@/lib/supabase/chatStorage'

interface SpeakerFormData {
  name: string;
  title: string;
  company: string;
  bio?: string;
}

interface SpeakerModalProps {
  isOpen: boolean
  speaker?: Speaker
  onClose: () => void
  onSubmit: (speakerData: SpeakerFormData) => Promise<void>
}

export default function SpeakerModal({ isOpen, speaker, onClose, onSubmit }: SpeakerModalProps) {
  const [form, setForm] = useState({
    name: '',
    title: '',
    company: '',
    bio: ''
  })

  // Update form when speaker prop changes
  useEffect(() => {
    if (speaker) {
      setForm({
        name: speaker.name,
        title: speaker.title,
        company: speaker.company,
        bio: speaker.bio || ''
      })
    } else {
      setForm({ name: '', title: '', company: '', bio: '' })
    }
  }, [speaker])

  const handleSubmit = async () => {
    if (!form.name || !form.title || !form.company) {
      alert('Please fill in all required fields')
      return
    }

    try {
      await onSubmit(form)
      onClose()
    } catch {
      alert('Failed to save speaker')
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
            {speaker ? 'Edit Speaker' : 'Add Speaker'}
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
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
                placeholder="Speaker name"
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
                placeholder="Job title"
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '14px', 
                marginBottom: '6px' 
              }}>
                Company *
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({...form, company: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
                placeholder="Company name"
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '14px', 
                marginBottom: '6px' 
              }}>
                Bio
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({...form, bio: e.target.value})}
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
                placeholder="Speaker biography"
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
              {speaker ? 'Update' : 'Create'} Speaker
            </button>
          </div>
        </div>
      </div>
    </>
  )
}