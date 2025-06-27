import { useState, useEffect } from 'react'
import Modal, { ModalHeader, ModalContent, ModalFooter } from '../../ui/Modal'
import Button from '../../ui/Button'
import { FormInput, FormTextarea } from '../../ui/FormInput'
import useConferenceForms from '@/hooks/admin/useConferenceForms'

interface SpeakerFormData {
  name: string
  title: string
  company: string
  bio: string
}

export default function SpeakerForm() {
  const { speakerForm, closeSpeakerForm, saveSpeaker } = useConferenceForms()
  
  const [formData, setFormData] = useState<SpeakerFormData>({
    name: '',
    title: '',
    company: '',
    bio: ''
  })

  // Update form data when modal opens/closes or data changes
  useEffect(() => {
    if (speakerForm.isOpen && speakerForm.data) {
      setFormData({
        name: speakerForm.data.name || '',
        title: speakerForm.data.title || '',
        company: speakerForm.data.company || '',
        bio: speakerForm.data.bio || ''
      })
    } else {
      setFormData({
        name: '',
        title: '',
        company: '',
        bio: ''
      })
    }
  }, [speakerForm.isOpen, speakerForm.data])

  const handleChange = (field: keyof SpeakerFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await saveSpeaker(formData)
    if (success) {
      // Form will be closed by saveSpeaker on success
    }
  }

  return (
    <Modal isOpen={speakerForm.isOpen} onClose={closeSpeakerForm} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader onClose={closeSpeakerForm}>
          <h3 className="text-xl font-semibold text-white">
            {speakerForm.isEditing ? 'Edit Speaker' : 'Add Speaker'}
          </h3>
        </ModalHeader>

        <ModalContent>
          <div className="space-y-4">
            {/* General Error */}
            {speakerForm.errors.general && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{speakerForm.errors.general}</p>
              </div>
            )}

            {/* Name */}
            <FormInput
              label="Full Name"
              placeholder="Enter speaker's full name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={speakerForm.errors.name}
              required
            />

            {/* Title */}
            <FormInput
              label="Job Title"
              placeholder="e.g., CEO, Senior Developer, Research Scientist"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={speakerForm.errors.title}
              required
            />

            {/* Company */}
            <FormInput
              label="Company"
              placeholder="Enter company or organization name"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              error={speakerForm.errors.company}
              required
            />

            {/* Bio */}
            <FormTextarea
              label="Biography"
              placeholder="Enter speaker's professional background and expertise"
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              error={speakerForm.errors.bio}
              required
              rows={6}
            />
          </div>
        </ModalContent>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={closeSpeakerForm}
            disabled={speakerForm.loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={speakerForm.loading}
            disabled={speakerForm.loading}
          >
            {speakerForm.isEditing ? 'Update Speaker' : 'Add Speaker'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}