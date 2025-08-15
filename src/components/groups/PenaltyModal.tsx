'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Alert, LoadingSpinner } from '@/components/ui'
import { GroupMember, Group } from '@/types'
import { getGroupMembers } from '@/lib/groups'

interface PenaltyModalProps {
  isOpen: boolean
  onClose: () => void
  member: GroupMember | null
  groupId?: string | undefined
  adminGroups?: Group[]
  onApplyPenalty?: (memberId: string, title: string, description: string, amount: number, groupId?: string) => Promise<void>
  onCreatePenaltyType?: (title: string, description: string, amount: number) => Promise<void>
  onEditPenaltyType?: (penaltyTypeId: string, title: string, description: string, amount: number) => Promise<void>
  editingPenaltyType?: { id: string; title: string; description: string; amount: number }
  mode?: 'apply' | 'create' | 'edit' // 'apply' = apply to member, 'create' = just create penalty type, 'edit' = edit existing penalty type
}

const PenaltyModal: React.FC<PenaltyModalProps> = ({
  isOpen,
  onClose,
  member,
  groupId,
  adminGroups,
  onApplyPenalty,
  onCreatePenaltyType,
  onEditPenaltyType,
  editingPenaltyType,
  mode = 'apply'
}) => {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupId || '')
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(member)
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (groupId) {
        setSelectedGroupId(groupId)
        loadMembers()
      }
      if (mode === 'edit' && editingPenaltyType) {
        setTitle(editingPenaltyType.title)
        setDescription(editingPenaltyType.description)
        setAmount(editingPenaltyType.amount.toString())
      } else {
        resetForm()
      }
    }
  }, [isOpen, groupId, mode, editingPenaltyType])

  useEffect(() => {
    if (selectedGroupId) {
      loadMembers()
    } else {
      setMembers([])
      setSelectedMember(null)
    }
  }, [selectedGroupId])

  useEffect(() => {
    setSelectedMember(member)
  }, [member])

  const loadMembers = async () => {
    if (!selectedGroupId) return
    
    try {
      setLoading(true)
      setError(null)
      const groupMembers = await getGroupMembers(selectedGroupId)
      // Filter out admins to only show regular members
      const regularMembers = groupMembers.filter(member => member.role === 'member' && member.isActive !== false)
      setMembers(regularMembers)
    } catch (error) {
      console.error('Error loading members:', error)
      setError('Failed to load group members')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setAmount('')
    setError(null)
    if (!groupId) {
      setSelectedGroupId('')
    }
    if (!member) {
      setSelectedMember(null)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const validateForm = () => {
    // Common validations for both modes
    if (!title.trim()) {
      setError('Please provide a title for the penalty')
      return false
    }

    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters long')
      return false
    }

    if (!description.trim()) {
      setError('Please provide a description for the penalty')
      return false
    }

    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters long')
      return false
    }

    const penaltyAmount = parseInt(amount)
    if (isNaN(penaltyAmount) || penaltyAmount <= 0) {
      setError('Please enter a valid penalty amount')
      return false
    }

    // Validations only for 'apply' mode
    if (mode === 'apply') {
      if (adminGroups && !selectedGroupId) {
        setError('Please select a group')
        return false
      }

      if (!selectedMember) {
        setError('Please select a member')
        return false
      }

      if (penaltyAmount > (selectedMember.pointsEarned - selectedMember.pointsRedeemed)) {
        setError(`Member only has ${selectedMember.pointsEarned - selectedMember.pointsRedeemed} available points`)
        return false
      }
    }

    // Validations for 'edit' mode
    if (mode === 'edit' && !editingPenaltyType) {
      setError('Invalid penalty type for editing')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log(`PenaltyModal: handleSubmit called with mode: ${mode}`)
    
    if (!validateForm()) {
      console.log('PenaltyModal: Form validation failed')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const penaltyAmount = parseInt(amount)

      console.log(`PenaltyModal: Processing penalty - Title: ${title}, Amount: ${penaltyAmount}`)

      if (mode === 'create' && onCreatePenaltyType) {
        console.log('PenaltyModal: Creating penalty type')
        await onCreatePenaltyType(title.trim(), description.trim(), penaltyAmount)
        console.log('PenaltyModal: Penalty type created successfully')
      } else if (mode === 'edit' && onEditPenaltyType && editingPenaltyType) {
        console.log(`PenaltyModal: Editing penalty type ${editingPenaltyType.id}`)
        await onEditPenaltyType(editingPenaltyType.id, title.trim(), description.trim(), penaltyAmount)
        console.log('PenaltyModal: Penalty type edited successfully')
      } else if (mode === 'apply' && onApplyPenalty && selectedMember) {
        console.log(`PenaltyModal: Applying penalty to member ${selectedMember.userName}`)
        await onApplyPenalty(selectedMember.userId, title.trim(), description.trim(), penaltyAmount, selectedGroupId)
        console.log('PenaltyModal: Penalty applied successfully')
      } else {
        console.error('PenaltyModal: Invalid state for submission', { mode, hasCreateFn: !!onCreatePenaltyType, hasApplyFn: !!onApplyPenalty, hasEditFn: !!onEditPenaltyType, hasSelectedMember: !!selectedMember, hasEditingPenaltyType: !!editingPenaltyType })
        throw new Error('Invalid penalty submission state')
      }
      
      handleClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process penalty'
      console.error('PenaltyModal: Error during submission:', error)
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  // Don't render if essential data is missing
  if (mode === 'apply' && !groupId && !adminGroups) {
    return null
  }
  
  // Don't render if required functions are missing for each mode
  if (mode === 'create' && !onCreatePenaltyType) {
    console.error('PenaltyModal: onCreatePenaltyType is required for create mode')
    return null
  }
  
  if (mode === 'edit' && !onEditPenaltyType) {
    console.error('PenaltyModal: onEditPenaltyType is required for edit mode')
    return null
  }
  
  if (mode === 'apply' && !onApplyPenalty) {
    console.error('PenaltyModal: onApplyPenalty is required for apply mode')
    return null
  }

  const modalTitle = mode === 'create' ? 'Create New Penalty Type' : 
    mode === 'edit' ? 'Edit Penalty Type' :
    (selectedMember ? `Apply Penalty to ${selectedMember.userName}` : 'Apply Penalty')
  
  const buttonText = mode === 'create' ? 'Create Penalty' : 
    mode === 'edit' ? 'Save Changes' : 'Apply Penalty'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size="md"
      footer={
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="penalty-form"
            variant="danger"
            disabled={submitting || loading || (mode === 'apply' && !selectedMember)}
          >
            {submitting ? <LoadingSpinner size="sm" /> : buttonText}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {mode === 'apply' && adminGroups && adminGroups.length > 0 && !groupId && (
          <div>
            <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2">
              Select Group (You Admin)
            </label>
            <select
              id="group"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            >
              <option value="">Choose a group...</option>
              {adminGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.memberCount} members)
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'apply' && !selectedMember ? (
          <div>
            <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-2">
              Select Member to Apply Penalty
            </label>
            <select
              id="member"
              value=""
              onChange={(e) => {
                const memberId = e.target.value
                const foundMember = members.find(m => m.userId === memberId)
                setSelectedMember(foundMember || null)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Choose a member...</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.userName} ({(member.pointsEarned || 0) - (member.pointsRedeemed || 0)} points available)
                </option>
              ))}
            </select>
          </div>
        ) : mode === 'apply' && selectedMember ? (
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">Member Information</h4>
            <div className="text-sm text-red-800 space-y-1">
              <p><span className="font-medium">Name:</span> {selectedMember.userName}</p>
              <p><span className="font-medium">Email:</span> {selectedMember.userEmail}</p>
              <p><span className="font-medium">Available Points:</span> {(selectedMember.pointsEarned || 0) - (selectedMember.pointsRedeemed || 0)}</p>
            </div>
            {!member && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedMember(null)}
                className="mt-2"
              >
                Change Member
              </Button>
            )}
          </div>
        ) : null}

        {(mode === 'create' || mode === 'edit' || selectedMember) && (
          <form id="penalty-form" onSubmit={handleSubmit} className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Penalty Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter penalty title (e.g., 'Late Submission', 'Rule Violation')..."
                    required
                    minLength={3}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Brief title describing the penalty type
                  </p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Provide a detailed description of why this penalty is being applied..."
                    required
                    minLength={10}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Minimum 10 characters. This will be visible to the member.
                  </p>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Points to Deduct <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    max={mode === 'apply' && selectedMember ? selectedMember.pointsEarned - selectedMember.pointsRedeemed : undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter points to deduct..."
                    required
                  />
                  {mode === 'apply' && selectedMember && (
                    <p className="mt-1 text-sm text-gray-500">
                      Maximum: {selectedMember.pointsEarned - selectedMember.pointsRedeemed} points
                    </p>
                  )}
                  {mode === 'create' && (
                    <p className="mt-1 text-sm text-gray-500">
                      Set the default point deduction amount for this penalty type
                    </p>
                  )}
                </div>

                {amount && title.trim() && description.length >= 10 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          {mode === 'create' ? 'Penalty Type Preview' : 
                           mode === 'edit' ? 'Edit Preview' : 'Penalty Confirmation'}
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          {mode === 'apply' && selectedMember ? (
                            <p>
                              You are about to deduct <span className="font-bold">{amount} points</span> from{' '}
                              <span className="font-semibold">{selectedMember.userName}</span>.
                            </p>
                          ) : mode === 'edit' ? (
                            <p>
                              Updating penalty type with <span className="font-bold">{amount} points</span> deduction.
                            </p>
                          ) : (
                            <p>
                              Creating penalty type with <span className="font-bold">{amount} points</span> deduction.
                            </p>
                          )}
                          <div className="mt-2 space-y-1">
                            <p><span className="font-medium">Title:</span> {title}</p>
                            <p><span className="font-medium">Description:</span> {description}</p>
                          </div>
                          <p className="mt-2 text-xs text-yellow-600">
                            {mode === 'create' ? 
                              'You can apply this penalty type to members later.' :
                            mode === 'edit' ?
                              'Changes will update the penalty type for future use.' :
                              'This action cannot be undone. Please ensure the penalty is justified.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </form>
        )}
      </div>
    </Modal>
  )
}

export default PenaltyModal