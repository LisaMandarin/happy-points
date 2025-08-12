'use client'

import React from 'react'
import { Modal, Button, Input, Alert } from '@/components/ui'
import { useForm } from '@/hooks/useForm'
import { JoinGroupFormData } from '@/types'
import { DEFAULT_VALUES } from '@/lib/constants'

interface JoinGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onJoinGroup: (groupCode: string) => Promise<void>
}

const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  isOpen,
  onClose,
  onJoinGroup
}) => {
  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm,
  } = useForm<JoinGroupFormData>({
    initialValues: {
      groupCode: '',
    },
    validate: (values) => {
      const errors: { [key: string]: string } = {}
      
      if (!values.groupCode.trim()) {
        errors.groupCode = 'Group code is required'
      } else if (values.groupCode.length !== DEFAULT_VALUES.GROUP.CODE_LENGTH) {
        errors.groupCode = `Group code must be ${DEFAULT_VALUES.GROUP.CODE_LENGTH} characters`
      } else if (!/^[A-Z0-9]+$/.test(values.groupCode.toUpperCase())) {
        errors.groupCode = 'Group code can only contain letters and numbers'
      }
      
      return errors
    },
    onSubmit: async (values) => {
      await onJoinGroup(values.groupCode.toUpperCase())
      resetForm()
      onClose()
    },
  })

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    handleChange('groupCode')({
      ...e,
      target: { ...e.target, value }
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Join Group"
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
            Join Group
          </Button>
        </div>
      }
    >
      {errors.general && (
        <Alert variant="error" className="mb-4">
          {errors.general}
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <Input
            label="Group Code"
            value={values.groupCode}
            onChange={handleCodeChange}
            error={errors.groupCode}
            placeholder="Enter 6-character group code"
            maxLength={DEFAULT_VALUES.GROUP.CODE_LENGTH}
            className="text-center text-lg font-mono tracking-wider"
          />
          <p className="mt-2 text-sm text-gray-500">
            Ask the group admin for the {DEFAULT_VALUES.GROUP.CODE_LENGTH}-character group code
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default JoinGroupModal