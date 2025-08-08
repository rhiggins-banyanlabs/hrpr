import { useState } from 'react'
import useConferenceData from '@/hooks/admin/useConferenceData'
import ConferenceHeader from './ConferenceHeader'
import ConferenceStats from './ConferenceStats'
import SpeakersList from './SpeakersList'
import SessionsList from './SessionsList'
import SpeakerModal from './SpeakerModal'
import SessionModal from './SessionModal'
import { Speaker, EventSession } from '@/lib/supabase/chatStorage'

export default function ConferenceTab() {
  const {
    sessions,
    speakers,
    loading,
    refreshData,
    exportData,
    createSpeaker,
    createSession,
    updateSpeaker,
    updateSession,
    deleteSpeakerById,
    deleteSessionById
  } = useConferenceData()

  // Modal states
  const [speakerModalOpen, setSpeakerModalOpen] = useState(false)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null)
  const [editingSession, setEditingSession] = useState<EventSession | null>(null)

  // Speaker handlers
  const handleAddSpeaker = () => {
    setEditingSpeaker(null)
    setSpeakerModalOpen(true)
  }

  const handleEditSpeaker = (speaker: Speaker) => {
    setEditingSpeaker(speaker)
    setSpeakerModalOpen(true)
  }

  const handleSpeakerSubmit = async (speakerData: Omit<Speaker, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingSpeaker) {
      await updateSpeaker(editingSpeaker.id, speakerData)
    } else {
      await createSpeaker(speakerData)
    }
  }

  const handleCloseSpeakerModal = () => {
    setSpeakerModalOpen(false)
    setEditingSpeaker(null)
  }

  // Session handlers
  const handleAddSession = () => {
    setEditingSession(null)
    setSessionModalOpen(true)
  }

  const handleEditSession = (session: EventSession) => {
    setEditingSession(session)
    setSessionModalOpen(true)
  }

  const handleSessionSubmit = async (sessionData: Omit<EventSession, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingSession) {
      await updateSession(editingSession.id, sessionData)
    } else {
      await createSession(sessionData)
    }
  }

  const handleCloseSessionModal = () => {
    setSessionModalOpen(false)
    setEditingSession(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <ConferenceHeader
        onAddSpeaker={handleAddSpeaker}
        onAddSession={handleAddSession}
        onRefresh={refreshData}
        onExport={exportData}
      />

      {/* Stats */}
      <ConferenceStats
        speakersCount={speakers.length}
        sessionsCount={sessions.length}
      />

      {/* Speakers */}
      <SpeakersList
        speakers={speakers}
        loading={loading}
        onAdd={handleAddSpeaker}
        onEdit={handleEditSpeaker}
        onDelete={deleteSpeakerById}
      />

      {/* Sessions */}
      <SessionsList
        sessions={sessions}
        loading={loading}
        onAdd={handleAddSession}
        onEdit={handleEditSession}
        onDelete={deleteSessionById}
      />

      {/* Modals */}
      <SpeakerModal
        isOpen={speakerModalOpen}
        speaker={editingSpeaker as Speaker}
        onClose={handleCloseSpeakerModal}
        onSubmit={handleSpeakerSubmit}
      />

      <SessionModal
        isOpen={sessionModalOpen}
        session={editingSession as EventSession}
        speakers={speakers}
        onClose={handleCloseSessionModal}
        onSubmit={handleSessionSubmit}
      />
    </div>
  )
}