'use client'

import React from 'react'
import { Modal, Button, Input, Alert } from '@/components/ui'
import { useForm } from '@/hooks/useForm'
import { CreateGroupFormData } from '@/types'
import { DEFAULT_VALUES } from '@/lib/constants'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGroup: (data: CreateGroupFormData) => Promise<void>
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup
}) => {
  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm,
  } = useForm<CreateGroupFormData>({
    initialValues: {
      name: '',
      description: '',
      maxMembers: DEFAULT_VALUES.GROUP.DEFAULT_MAX_MEMBERS,
      isPrivate: true, // All groups are now private by default
    },
    validate: (values) => {
      const errors: { [key: string]: string } = {}
      
      if (!values.name.trim()) {
        errors.name = 'Group name is required'
      } else if (values.name.length < 3) {
        errors.name = 'Group name must be at least 3 characters'
      } else if (values.name.length > 50) {
        errors.name = 'Group name must be less than 50 characters'
      }
      
      if (values.description.length > 200) {
        errors.description = 'Description must be less than 200 characters'
      }
      
      if (values.maxMembers < DEFAULT_VALUES.GROUP.MIN_MEMBERS) {
        errors.maxMembers = `Minimum ${DEFAULT_VALUES.GROUP.MIN_MEMBERS} members required`
      } else if (values.maxMembers > DEFAULT_VALUES.GROUP.MAX_MEMBERS) {
        errors.maxMembers = `Maximum ${DEFAULT_VALUES.GROUP.MAX_MEMBERS} members allowed`
      }
      
      return errors
    },
    onSubmit: async (values) => {
      await onCreateGroup(values)
      resetForm()
      onClose()
    },
  })

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Group"
      size="md"
      footer={
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            onClick={handleSubmit}
          >
            Create Group
          </Button>
        </div>
      }
    >
      {errors.general && (
        <Alert variant="error" className="mb-4">
          {errors.general}
        </Alert>
      )}

      <div className="space-y-6">
        <Input
          label="Group Name *"
          value={values.name}
          onChange={handleChange('name')}
          error={errors.name}
          placeholder="Enter group name"
          maxLength={50}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={values.description}
            onChange={(e) => handleChange('description')(e as any)}
            className={`
              w-full px-3 py-2 border rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:border-transparent
              ${errors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
            `}
            rows={3}
            placeholder="Optional description for your group"
            maxLength={200}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {values.description.length}/200 characters
          </p>
        </div>

        <Input
          label="Maximum Members *"
          type="number"
          value={values.maxMembers.toString()}
          onChange={(e) => handleChange('maxMembers')({
            ...e,
            target: { ...e.target, value: parseInt(e.target.value) || 0 }
          } as any)}
          error={errors.maxMembers}
          min={DEFAULT_VALUES.GROUP.MIN_MEMBERS}
          max={DEFAULT_VALUES.GROUP.MAX_MEMBERS}
          helperText={`Min: ${DEFAULT_VALUES.GROUP.MIN_MEMBERS}, Max: ${DEFAULT_VALUES.GROUP.MAX_MEMBERS}`}
        />

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            📧 Invitation-Only Groups
          </h4>
          <p className="text-sm text-blue-800">
            All groups are private and can only be joined through invitations sent by the group admin. 
            Share invitation links with people you want to join your group.
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default CreateGroupModal