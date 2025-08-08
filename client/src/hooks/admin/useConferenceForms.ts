import { useState } from 'react'
import { Speaker, EventSession } from '@/lib/supabase/chatStorage'
import useConferenceData from './useConferenceData'

interface FormState {
  isOpen: boolean
  isEditing: boolean
  data: any
  loading: boolean
  errors: Record<string, string>
}

const initialFormState: FormState = {
  isOpen: false,
  isEditing: false,
  data: null,
  loading: false,
  errors: {}
}

export default function useConferenceForms() {
  const conferenceData = useConferenceData()
  
  // Form states
  const [sessionForm, setSessionForm] = useState<FormState>(initialFormState)
  const [speakerForm, setSpeakerForm] = useState<FormState>(initialFormState)

  // Session form methods
  const openSessionForm = (session?: EventSession) => {
    setSessionForm({
      isOpen: true,
      isEditing: !!session,
      data: session || {
        time: '',
        title: '',
        speaker: '',
        description: '',
        location: ''
      },
      loading: false,
      errors: {}
    })
  }

  const closeSessionForm = () => {
    setSessionForm(initialFormState)
  }

  const saveSession = async (sessionData: Partial<EventSession>) => {
    try {
      setSessionForm(prev => ({ ...prev, loading: true, errors: {} }))
      
      // Validate session data
      const errors = validateSessionData(sessionData)
      if (Object.keys(errors).length > 0) {
        setSessionForm(prev => ({ ...prev, errors, loading: false }))
        return false
      }

      if (sessionForm.isEditing && sessionForm.data?.id) {
        await conferenceData.updateSession(sessionForm.data.id, sessionData)
      } else {
        await conferenceData.createSession(sessionData as Omit<EventSession, 'id' | 'created_at' | 'updated_at'>)
      }
      
      closeSessionForm()
      return true
    } catch (error) {
      setSessionForm(prev => ({ 
        ...prev, 
        loading: false,
        errors: { general: error instanceof Error ? error.message : 'Failed to save session' }
      }))
      return false
    }
  }

  const editSession = (session: EventSession) => {
    openSessionForm(session)
  }

  const deleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return false
    
    try {
      await conferenceData.deleteSessionById(id)
      return true
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete session')
      return false
    }
  }

  // Speaker form methods
  const openSpeakerForm = (speaker?: Speaker) => {
    setSpeakerForm({
      isOpen: true,
      isEditing: !!speaker,
      data: speaker || {
        name: '',
        title: '',
        company: '',
        bio: ''
      },
      loading: false,
      errors: {}
    })
  }

  const closeSpeakerForm = () => {
    setSpeakerForm(initialFormState)
  }

  const saveSpeaker = async (speakerData: Partial<Speaker>) => {
    try {
      setSpeakerForm(prev => ({ ...prev, loading: true, errors: {} }))
      
      // Validate speaker data
      const errors = validateSpeakerData(speakerData)
      if (Object.keys(errors).length > 0) {
        setSpeakerForm(prev => ({ ...prev, errors, loading: false }))
        return false
      }

      if (speakerForm.isEditing && speakerForm.data?.id) {
        await conferenceData.updateSpeaker(speakerForm.data.id, speakerData)
      } else {
        await conferenceData.createSpeaker(speakerData as Omit<Speaker, 'id' | 'created_at' | 'updated_at'>)
      }
      
      closeSpeakerForm()
      return true
    } catch (error) {
      setSpeakerForm(prev => ({ 
        ...prev, 
        loading: false,
        errors: { general: error instanceof Error ? error.message : 'Failed to save speaker' }
      }))
      return false
    }
  }

  const editSpeaker = (speaker: Speaker) => {
    openSpeakerForm(speaker)
  }

  const deleteSpeaker = async (id: string) => {
    if (!confirm("Are you sure you want to delete this speaker?")) return false
    
    try {
      await conferenceData.deleteSpeakerById(id)
      return true
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete speaker')
      return false
    }
  }

  // Validation functions
  const validateSessionData = (data: Partial<EventSession>): Record<string, string> => {
    const errors: Record<string, string> = {}
    
    if (!data.time?.trim()) {
      errors.time = 'Time is required'
    }
    
    if (!data.title?.trim()) {
      errors.title = 'Title is required'
    }
    
    if (!data.speaker?.trim()) {
      errors.speaker = 'Speaker is required'
    }
    
    if (!data.description?.trim()) {
      errors.description = 'Description is required'
    }
    
    return errors
  }

  const validateSpeakerData = (data: Partial<Speaker>): Record<string, string> => {
    const errors: Record<string, string> = {}
    
    if (!data.name?.trim()) {
      errors.name = 'Name is required'
    }
    
    if (!data.title?.trim()) {
      errors.title = 'Title is required'
    }
    
    if (!data.company?.trim()) {
      errors.company = 'Company is required'
    }
    
    if (!data.bio?.trim()) {
      errors.bio = 'Bio is required'
    }
    
    return errors
  }

  return {
    // Session form
    sessionForm,
    openSessionForm,
    closeSessionForm,
    saveSession,
    editSession,
    deleteSession,
    
    // Speaker form
    speakerForm,
    openSpeakerForm,
    closeSpeakerForm,
    saveSpeaker,
    editSpeaker,
    deleteSpeaker
  }
}