import { useState, useEffect } from 'react'
import Modal, { ModalHeader, ModalContent, ModalFooter } from '../../ui/Modal'
import Button from '../../ui/Button'
import { FormInput, FormTextarea, FormSelect } from '../../ui/FormInput'
import useConferenceForms from '@/hooks/admin/useConferenceForms'
import useConferenceData from '@/hooks/admin/useConferenceData'

interface SessionFormData {
  time: string
  title: string
  speaker: string
  description: string
  location: string
}

export default function SessionForm() {
  const { sessionForm, closeSessionForm, saveSession } = useConferenceForms()
  const { speakers } = useConferenceData()
  
  const [formData, setFormData] = useState<SessionFormData>({
    time: '',
    title: '',
    speaker: '',
    description: '',
    location: ''
  })

  // Update form data when modal opens/closes or data changes
  useEffect(() => {
    if (sessionForm.isOpen && sessionForm.data) {
      setFormData({
        time: sessionForm.data.time || '',
        title: sessionForm.data.title || '',
        speaker: sessionForm.data.speaker || '',
        description: sessionForm.data.description || '',
        location: sessionForm.data.location || ''
      })
    } else {
      setFormData({
        time: '',
        title: '',
        speaker: '',
        description: '',
        location: ''
      })
    }
  }, [sessionForm.isOpen, sessionForm.data])

  const handleChange = (field: keyof SessionFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await saveSession(formData)
    if (success) {
      // Form will be closed by saveSession on success
    }
  }

  const speakerOptions = speakers.map(speaker => ({
    value: speaker.id!,
    label: speaker.name
  }))

  return (
    <Modal isOpen={sessionForm.isOpen} onClose={closeSessionForm} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={closeSessionForm}>
          <h3 className="text-xl font-semibold text-white">
            {sessionForm.isEditing ? 'Edit Session' : 'Add Session'}
          </h3>
        </ModalHeader>

        <ModalContent>
          <div className="space-y-4">
            {/* General Error */}
            {sessionForm.errors.general && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{sessionForm.errors.general}</p>
              </div>
            )}

            {/* Time */}
            <FormInput
              label="Time"
              placeholder="e.g., 9:00 AM, 2:30 PM"
              value={formData.time}
              onChange={(e) => handleChange('time', e.target.value)}
              error={sessionForm.errors.time}
              required
            />

            {/* Title */}
            <FormInput
              label="Session Title"
              placeholder="Enter session title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={sessionForm.errors.title}
              required
            />

            {/* Speaker */}
            <FormSelect
              label="Speaker"
              placeholder="Select a speaker"
              value={formData.speaker}
              onChange={(e) => handleChange('speaker', e.target.value)}
              options={speakerOptions}
              error={sessionForm.errors.speaker}
              required
            />

            {/* Description */}
            <FormTextarea
              label="Description"
              placeholder="Enter session description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={sessionForm.errors.description}
              required
              rows={4}
            />

            {/* Location */}
            <FormInput
              label="Location (Optional)"
              placeholder="e.g., Main Hall, Room A"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              error={sessionForm.errors.location}
            />
          </div>
        </ModalContent>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={closeSessionForm}
            disabled={sessionForm.loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={sessionForm.loading}
            disabled={sessionForm.loading}
          >
            {sessionForm.isEditing ? 'Update Session' : 'Add Session'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}