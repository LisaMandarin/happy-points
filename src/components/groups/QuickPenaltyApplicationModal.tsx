'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Alert, LoadingSpinner } from '@/components/ui'
import { Group, GroupMember, GroupPenaltyType } from '@/types'
import { getGroupMembers } from '@/lib/groups'
import { getGroupPenaltyTypes } from '@/lib/firestore'

interface QuickPenaltyApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  adminGroups: Group[]
  currentUserId: string
  onApplyPenalty: (memberId: string, penaltyTypeId: string, reason?: string, groupId?: string) => Promise<void>
}

const QuickPenaltyApplicationModal: React.FC<QuickPenaltyApplicationModalProps> = ({
  isOpen,
  onClose,
  adminGroups,
  currentUserId,
  onApplyPenalty
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [members, setMembers] = useState<GroupMember[]>([])
  const [penaltyTypes, setPenaltyTypes] = useState<GroupPenaltyType[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [selectedPenaltyTypeId, setSelectedPenaltyTypeId] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingPenaltyTypes, setLoadingPenaltyTypes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupData(selectedGroupId)
    } else {
      setMembers([])
      setPenaltyTypes([])
      setSelectedMemberId('')
      setSelectedPenaltyTypeId('')
    }
  }, [selectedGroupId])

  const loadGroupData = async (groupId: string) => {
    try {
      setLoadingMembers(true)
      setLoadingPenaltyTypes(true)
      setError(null)

      const [groupMembers, groupPenaltyTypes] = await Promise.all([
        getGroupMembers(groupId),
        getGroupPenaltyTypes(groupId)
      ])

      // Filter out current user and inactive members
      const eligibleMembers = groupMembers.filter(member => 
        member.userId !== currentUserId && member.isActive
      )

      // Filter to active penalty types only
      const activePenaltyTypes = groupPenaltyTypes.filter(pt => pt.isActive)

      setMembers(eligibleMembers)
      setPenaltyTypes(activePenaltyTypes)
    } catch (error) {
      console.error('Error loading group data:', error)
      setError('Failed to load group data')
    } finally {
      setLoadingMembers(false)
      setLoadingPenaltyTypes(false)
    }
  }

  const resetForm = () => {
    setSelectedGroupId('')
    setSelectedMemberId('')
    setSelectedPenaltyTypeId('')
    setReason('')
    setError(null)
    setSuccessMessage(null)
    setMembers([])
    setPenaltyTypes([])
  }

  const handleSubmit = async () => {
    if (!selectedGroupId || !selectedMemberId || !selectedPenaltyTypeId) {
      setError('Please select a group, member, and penalty type')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await onApplyPenalty(
        selectedMemberId,
        selectedPenaltyTypeId,
        reason.trim() || undefined,
        selectedGroupId
      )

      const selectedMember = members.find(m => m.userId === selectedMemberId)
      const selectedPenaltyType = penaltyTypes.find(pt => pt.id === selectedPenaltyTypeId)
      
      setSuccessMessage(
        `Penalty "${selectedPenaltyType?.title}" applied to ${selectedMember?.userName}`
      )

      // Reset form
      setSelectedMemberId('')
      setSelectedPenaltyTypeId('')
      setReason('')

      // Close modal after delay
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to apply penalty')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const selectedGroup = adminGroups.find(g => g.id === selectedGroupId)
  const selectedMember = members.find(m => m.userId === selectedMemberId)
  const selectedPenaltyType = penaltyTypes.find(pt => pt.id === selectedPenaltyTypeId)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Apply Penalty"
      size="lg"
      footer={
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedGroupId || !selectedMemberId || !selectedPenaltyTypeId || submitting}
            loading={submitting}
            danger
          >
            {submitting ? 'Applying...' : 'Apply Penalty'}
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

        {/* Group Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Group
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a group...</option>
            {adminGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {adminGroups.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">
              You don't admin any groups.
            </p>
          )}
        </div>

        {/* Member Selection */}
        {selectedGroupId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Member to Penalize
            </label>
            {loadingMembers ? (
              <div className="flex items-center py-2">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-gray-600">Loading members...</span>
              </div>
            ) : (
              <>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a member...</option>
                  {members.map(member => (
                    <option key={member.userId} value={member.userId}>
                      {member.userName} ({member.userEmail})
                    </option>
                  ))}
                </select>
                {members.length === 0 && selectedGroupId && (
                  <p className="text-sm text-gray-500 mt-1">
                    No eligible members found (active members only, excluding yourself)
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Penalty Type Selection */}
        {selectedGroupId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Penalty Type
            </label>
            {loadingPenaltyTypes ? (
              <div className="flex items-center py-2">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-gray-600">Loading penalty types...</span>
              </div>
            ) : (
              <>
                <select
                  value={selectedPenaltyTypeId}
                  onChange={(e) => setSelectedPenaltyTypeId(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a penalty type...</option>
                  {penaltyTypes.map(penaltyType => (
                    <option key={penaltyType.id} value={penaltyType.id}>
                      {penaltyType.title} (-{penaltyType.amount} points)
                    </option>
                  ))}
                </select>
                {penaltyTypes.length === 0 && selectedGroupId && !loadingPenaltyTypes && (
                  <p className="text-sm text-gray-500 mt-1">
                    No active penalty types found. Create penalty types first in the group's penalty management.
                  </p>
                )}
              </>
            )}
          </div>
        )}

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
        {selectedGroupId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide additional context for why this penalty is being applied..."
              rows={3}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <p className="text-sm text-gray-500 mt-1">
              This will be included with the penalty record for transparency.
            </p>
          </div>
        )}

        {/* Selected Member & Penalty Preview */}
        {selectedGroup && selectedMember && selectedPenaltyType && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-2">
              ⚠️ Penalty Application Preview
            </h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Group:</span> {selectedGroup.name}</p>
              <p><span className="font-medium">Member:</span> {selectedMember.userName}</p>
              <p><span className="font-medium">Penalty:</span> {selectedPenaltyType.title}</p>
              <p><span className="font-medium">Points Deducted:</span> -{selectedPenaltyType.amount}</p>
              {reason && <p><span className="font-medium">Reason:</span> {reason}</p>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default QuickPenaltyApplicationModal