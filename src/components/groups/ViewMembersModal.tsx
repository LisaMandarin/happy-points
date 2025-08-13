'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, LoadingSpinner, Badge, Alert } from '@/components/ui'
import { Group, GroupMember, UserProfile } from '@/types'
import { getGroupMembers, deactivateGroupMember } from '@/lib/groups'
import { getUserProfile } from '@/lib/firestore'
import { formatDate, formatPoints } from '@/lib/utils'

interface ViewMembersModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUserId: string
  isAdmin: boolean
  onMemberClick?: (member: GroupMember) => void
}

const ViewMembersModal: React.FC<ViewMembersModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUserId,
  isAdmin,
  onMemberClick
}) => {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [memberProfiles, setMemberProfiles] = useState<Map<string, UserProfile>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadMembers()
    }
  }, [isOpen, group.id])

  const loadMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const groupMembers = await getGroupMembers(group.id)
      setMembers(groupMembers)
      
      // Load user profiles for current points display
      const profilesMap = new Map<string, UserProfile>()
      await Promise.all(
        groupMembers.map(async (member) => {
          try {
            const profile = await getUserProfile(member.userId)
            if (profile) {
              profilesMap.set(member.userId, profile)
            }
          } catch (error) {
            console.error('Error loading profile for user:', member.userId, error)
          }
        })
      )
      setMemberProfiles(profilesMap)
    } catch (error) {
      console.error('Error loading members:', error)
      setError('Failed to load group members')
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivateMember = async (member: GroupMember) => {
    if (!window.confirm(`Are you sure you want to deactivate ${member.userName}? They will no longer be able to participate in group activities, but their data will be preserved.`)) {
      return
    }

    try {
      setRemovingMemberId(member.userId)
      setError(null)
      
      await deactivateGroupMember(group.id, member.userId, currentUserId)
      
      setSuccessMessage(`${member.userName} has been deactivated`)
      // Reload members to reflect the change
      await loadMembers()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error deactivating member:', error)
      setError(error instanceof Error ? error.message : 'Failed to deactivate member')
    } finally {
      setRemovingMemberId(null)
    }
  }

  const getRoleBadge = (role: string, isCurrentUser: boolean) => {
    if (role === 'admin') {
      return <Badge variant="info" size="sm">Admin</Badge>
    }
    if (isCurrentUser) {
      return <Badge variant="success" size="sm">You</Badge>
    }
    return <Badge variant="default" size="sm">Member</Badge>
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Members of ${group.name}`}
      size="md"
      footer={
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {members.length} of {group.maxMembers} members
          </span>
          <Button onClick={onClose}>
            Close
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

        {successMessage && (
          <Alert variant="success">
            {successMessage}
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {members
              .filter(member => isAdmin || member.isActive !== false) // Hide deactivated members for non-admins
              .map((member) => {
              const isCurrentUser = member.userId === currentUserId
              const isDeactivated = member.isActive === false
              return (
                <div 
                  key={member.id} 
                  className={`border rounded-lg p-4 relative ${
                    isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  } ${isDeactivated ? 'opacity-60' : ''}`}
                >
                  {isDeactivated && isAdmin && (
                    <div className="absolute inset-0 bg-gray-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                      <div className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Deactivated
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {isAdmin && !isCurrentUser && onMemberClick ? (
                          <button
                            onClick={() => onMemberClick(member)}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition duration-200"
                            title="Click to award points"
                          >
                            {member.userName || 'Unknown User'}
                          </button>
                        ) : (
                          <h4 className="font-medium text-gray-900">
                            {member.userName || 'Unknown User'}
                          </h4>
                        )}
                        {getRoleBadge(member.role, isCurrentUser)}
                      </div>
                      
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>Joined {formatDate(member.joinedAt)}</p>
                        {member.userEmail && (
                          <p className="truncate">{member.userEmail}</p>
                        )}
                      </div>

                      {/* Points section - only visible to admin */}
                      {isAdmin && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Points Earned:</span>
                              <p className="font-medium text-green-600">
                                +{formatPoints(member.pointsEarned || 0)}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Points Redeemed:</span>
                              <p className="font-medium text-red-600">
                                -{formatPoints(member.pointsRedeemed || 0)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="text-gray-500 text-sm">Net Points:</span>
                            <p className="font-semibold text-gray-900">
                              {formatPoints((member.pointsEarned || 0) - (member.pointsRedeemed || 0))}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Deactivate button for admin (only for non-admin members, not current user, and active members) */}
                    {isAdmin && !isCurrentUser && member.role !== 'admin' && member.isActive !== false && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivateMember(member)}
                          loading={removingMemberId === member.userId}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                        >
                          {removingMemberId === member.userId ? 'Deactivating...' : '⏸️ Deactivate Member'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-gray-500">No members found</p>
          </div>
        )}

        {/* Admin-only summary */}
        {isAdmin && members.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Group Summary (Admin View):
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div>
                <span className="text-blue-800 font-medium">
                  {members.filter(m => m.isActive !== false).length}
                </span>
                <span className="text-blue-600 ml-1">Active Members</span>
              </div>
              <div>
                <span className="text-blue-800 font-medium">
                  {members.filter(m => m.isActive === false).length}
                </span>
                <span className="text-blue-600 ml-1">Deactivated</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-800 font-medium">
                  {members.reduce((sum, member) => sum + (member.pointsEarned || 0), 0).toLocaleString()}
                </span>
                <span className="text-blue-600 ml-1">Total Earned</span>
              </div>
              <div>
                <span className="text-blue-800 font-medium">
                  {members.reduce((sum, member) => sum + (member.pointsRedeemed || 0), 0).toLocaleString()}
                </span>
                <span className="text-blue-600 ml-1">Total Redeemed</span>
              </div>
              <div>
                <span className="text-blue-800 font-medium">
                  {(
                    members.reduce((sum, member) => sum + (member.pointsEarned || 0), 0) -
                    members.reduce((sum, member) => sum + (member.pointsRedeemed || 0), 0)
                  ).toLocaleString()}
                </span>
                <span className="text-blue-600 ml-1">Net Points</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ViewMembersModal