'use client'

import React, { useState } from 'react'
import { Modal, Button, Alert, LoadingSpinner } from '@/components/ui'
import { Group, UserProfile, GroupPenaltyType, GroupMember } from '@/types'
import { useGroupPenaltyTypes } from '@/hooks/queries/useGroups'
import { useGroupMembers } from '@/hooks/queries/useGroups'
import { formatDate } from '@/lib/utils'

interface PenaltyApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUser: UserProfile | null
  onApplyPenalty: (memberId: string, penaltyTypeId: string, reason?: string) => Promise<void>
}

const PenaltyApplicationModal: React.FC<PenaltyApplicationModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  onApplyPenalty
}) => {
  // State
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [selectedPenaltyTypeId, setSelectedPenaltyTypeId] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  // Data fetching
  const { 
    data: penaltyTypes = [], 
    isLoading: loadingPenaltyTypes 
  } = useGroupPenaltyTypes(isOpen ? group.id : undefined)

  const { 
    data: members = [], 
    isLoading: loadingMembers 
  } = useGroupMembers(isOpen ? group.id : undefined)

  // Filter active penalty types and non-admin members
  const activePenaltyTypes = penaltyTypes.filter(pt => pt.isActive)
  const eligibleMembers = members.filter(member => 
    member.userId !== currentUser?.id && member.isActive
  )

  const selectedPenaltyType = activePenaltyTypes.find(pt => pt.id === selectedPenaltyTypeId)
  const selectedMember = eligibleMembers.find(m => m.userId === selectedMemberId)

  const handleSubmit = async () => {
    if (!selectedMemberId || !selectedPenaltyTypeId) {
      setError('Please select both a member and penalty type')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await onApplyPenalty(selectedMemberId, selectedPenaltyTypeId, reason.trim() || undefined)
      setSuccessMessage(`Penalty "${selectedPenaltyType?.title}" applied to ${selectedMember?.userName}`)
      
      // Reset form
      setSelectedMemberId('')
      setSelectedPenaltyTypeId('')
      setReason('')
      
      // Close modal after delay
      setTimeout(() => {
        onClose()
        setSuccessMessage('')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to apply penalty')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedMemberId('')
    setSelectedPenaltyTypeId('')
    setReason('')
    setError('')
    setSuccessMessage('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Apply Penalty - ${group.name}`}
      size="lg"
      footer={
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedMemberId || !selectedPenaltyTypeId || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Applying...' : 'Apply Penalty'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Success Message */}
        {successMessage && (
          <Alert variant="success">
            {successMessage}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {(loadingPenaltyTypes || loadingMembers) ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-2 text-gray-600">Loading data...</span>
          </div>
        ) : (
          <>
            {/* Member Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Member to Penalize
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a member...</option>
                {eligibleMembers.map(member => (
                  <option key={member.userId} value={member.userId}>
                    {member.userName} ({member.userEmail})
                  </option>
                ))}
              </select>
              {eligibleMembers.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No eligible members found (active members only, excluding yourself)
                </p>
              )}
            </div>

            {/* Penalty Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Penalty Type
              </label>
              <select
                value={selectedPenaltyTypeId}
                onChange={(e) => setSelectedPenaltyTypeId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a penalty type...</option>
                {activePenaltyTypes.map(penaltyType => (
                  <option key={penaltyType.id} value={penaltyType.id}>
                    {penaltyType.title} (-{penaltyType.amount} points)
                  </option>
                ))}
              </select>
              {activePenaltyTypes.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No active penalty types found. Create penalty types first.
                </p>
              )}
            </div>

            {/* Selected Penalty Type Details */}
            {selectedPenaltyType && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <h4 className="font-medium text-orange-900 mb-1">
                  {selectedPenaltyType.title}
                </h4>
                <p className="text-sm text-orange-700 mb-2">
                  {selectedPenaltyType.description}
                </p>
                <div className="text-sm text-orange-600">
                  <span className="font-medium">Points:</span> -{selectedPenaltyType.amount}
                </div>
              </div>
            )}

            {/* Optional Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide additional context for why this penalty is being applied..."
                rows={3}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <p className="text-sm text-gray-500 mt-1">
                This will be included with the penalty record for transparency.
              </p>
            </div>

            {/* Selected Member & Penalty Preview */}
            {selectedMember && selectedPenaltyType && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-2">
                  ⚠️ Penalty Application Preview
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Member:</span> {selectedMember.userName}</p>
                  <p><span className="font-medium">Penalty:</span> {selectedPenaltyType.title}</p>
                  <p><span className="font-medium">Points Deducted:</span> -{selectedPenaltyType.amount}</p>
                  {reason && <p><span className="font-medium">Reason:</span> {reason}</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

export default PenaltyApplicationModal