import { useState, useEffect } from 'react'
import { ConferenceStorageService, Speaker, EventSession } from '@/lib/supabase/chatStorage'

export default function useConferenceData() {
  const [sessions, setSessions] = useState<EventSession[]>([])
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all conference data
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [speakersData, sessionsData] = await Promise.all([
        ConferenceStorageService.getAllSpeakers(),
        ConferenceStorageService.getAllSessions()
      ])
      
      setSpeakers(speakersData || [])
      setSessions(sessionsData || [])
    } catch (err) {
      console.error('Error loading conference data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load conference data')
    } finally {
      setLoading(false)
    }
  }

  // Refresh data
  const refreshData = () => {
    loadData()
  }

  // Helper functions
  const getSpeakerById = (speakerId: string) => {
    return speakers.find(speaker => speaker.id === speakerId)
  }

  const getSessionsBySpeaker = (speakerId: string) => {
    return sessions.filter(session => session.speaker === speakerId)
  }

  const groupSessionsByTime = () => {
    const grouped: { [key: string]: EventSession[] } = {}
    sessions.forEach(session => {
      const timeKey = session.time
      if (!grouped[timeKey]) {
        grouped[timeKey] = []
      }
      grouped[timeKey].push(session)
    })
    return grouped
  }

  const getUniqueTimeSlots = () => {
    return [...new Set(sessions.map(session => session.time))].sort()
  }

  // CRUD operations
  const createSession = async (sessionData: Omit<EventSession, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null)
      const newSession = await ConferenceStorageService.createSession(sessionData)
      if (newSession) {
        setSessions(prev => [...prev, newSession])
        return newSession
      }
      throw new Error('Failed to create session')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
      throw err
    }
  }

  const updateSession = async (id: string, updates: Partial<EventSession>) => {
    try {
      setError(null)
      const updatedSession = await ConferenceStorageService.updateSession(id, updates)
      if (updatedSession) {
        setSessions(prev => prev.map(session => 
          session.id === id ? updatedSession : session
        ))
        return updatedSession
      }
      throw new Error('Failed to update session')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session')
      throw err
    }
  }

  const deleteSessionById = async (id: string) => {
    try {
      setError(null)
      const success = await ConferenceStorageService.deleteSession(id)
      if (success) {
        setSessions(prev => prev.filter(session => session.id !== id))
        return true
      }
      throw new Error('Failed to delete session')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session')
      throw err
    }
  }

  const createSpeaker = async (speakerData: Omit<Speaker, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null)
      const newSpeaker = await ConferenceStorageService.createSpeaker(speakerData)
      if (newSpeaker) {
        setSpeakers(prev => [...prev, newSpeaker])
        return newSpeaker
      }
      throw new Error('Failed to create speaker')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create speaker')
      throw err
    }
  }

  const updateSpeaker = async (id: string, updates: Partial<Speaker>) => {
    try {
      setError(null)
      const updatedSpeaker = await ConferenceStorageService.updateSpeaker(id, updates)
      if (updatedSpeaker) {
        setSpeakers(prev => prev.map(speaker => 
          speaker.id === id ? updatedSpeaker : speaker
        ))
        return updatedSpeaker
      }
      throw new Error('Failed to update speaker')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update speaker')
      throw err
    }
  }

  const deleteSpeakerById = async (id: string) => {
    try {
      setError(null)
      const success = await ConferenceStorageService.deleteSpeaker(id)
      if (success) {
        setSpeakers(prev => prev.filter(speaker => speaker.id !== id))
        return true
      }
      throw new Error('Failed to delete speaker')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete speaker')
      throw err
    }
  }

  // Export data
  const exportData = () => {
    const data = {
      sessions,
      speakers,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conference-agenda-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  return {
    // Data
    sessions,
    speakers,
    loading,
    error,
    
    // Helper functions
    getSpeakerById,
    getSessionsBySpeaker,
    groupSessionsByTime,
    getUniqueTimeSlots,
    
    // Actions
    refreshData,
    exportData,
    
    // CRUD operations
    createSession,
    updateSession,
    deleteSessionById,
    createSpeaker,
    updateSpeaker,
    deleteSpeakerById
  }
}