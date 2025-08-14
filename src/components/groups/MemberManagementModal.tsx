'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Tabs } from 'antd'
import { Group, UserProfile, GroupMember, GroupInvitation, InviteUsersFormData } from '@/types'
import { LoadingSpinner, Badge, Alert } from '@/components/ui'
import { getGroupMembers, deactivateGroupMember, activateGroupMember, cancelInvitation, resendInvitation } from '@/lib/groups'
import { getUserProfile, getUserByEmail } from '@/lib/firestore'
import { formatDate, formatPoints, validateEmail, generateInvitationLink, getTimeAgo } from '@/lib/utils'
import { useForm } from '@/hooks/useForm'
import InviteUsersModal from './InviteUsersModal'
import ViewMembersModal from './ViewMembersModal'
import { getInvitationStatusBadge } from '@/lib/utils/statusBadges'
import { useGroupInvitations, useCancelInvitation, useResendInvitation } from '@/hooks/queries/useGroups'

interface MemberManagementModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUser: UserProfile | null
  onInviteUsers: (emails: string[]) => Promise<any>
  onMemberClick?: (member: any) => void
}

interface ManageInvitationsContentProps {
  group: Group
  adminName: string
}

const ManageInvitationsContent: React.FC<ManageInvitationsContentProps> = ({ group, adminName }) => {
  const { data: invitations = [], isLoading: loading, error: dataError, refetch: reload } = useGroupInvitations(group.id)

  const cancelInvitationMutation = useCancelInvitation()
  const resendInvitationMutation = useResendInvitation()
  
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleCancelInvitation = async (invitation: GroupInvitation) => {
    try {
      setActionLoading(invitation.id)
      setError(null)
      await cancelInvitationMutation.mutateAsync(invitation.id)
      setSuccess('Invitation cancelled successfully')
      clearMessages()
    } catch (error) {
      setError('Failed to cancel invitation')
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }

  const handleResendInvitation = async (invitation: GroupInvitation) => {
    try {
      setActionLoading(invitation.id)
      setError(null)
      await resendInvitationMutation.mutateAsync({
        invitationId: invitation.id,
        groupId: group.id,
        groupName: group.name,
        adminId: group.adminId,
        adminName,
        inviteeEmail: invitation.inviteeEmail
      })
      setSuccess('Invitation resent successfully')
      clearMessages()
    } catch (error) {
      setError('Failed to resend invitation')
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }

  const copyInvitationLink = async (invitationCode: string) => {
    const link = generateInvitationLink(invitationCode)
    try {
      await navigator.clipboard.writeText(link)
      setSuccess('Invitation link copied to clipboard')
      clearMessages()
    } catch (error) {
      setError('Failed to copy link')
      clearMessages()
    }
  }

  const clearMessages = () => {
    setTimeout(() => {
      setSuccess(null)
      setError(null)
    }, 3000)
  }

  const isActionable = (invitation: GroupInvitation) => {
    const now = new Date()
    const expiresAt = invitation.expiresAt instanceof Date 
      ? invitation.expiresAt 
      : invitation.expiresAt.toDate()
    
    return invitation.status === 'pending' && now <= expiresAt
  }

  const filteredInvitations = (invitations || []).filter(inv => 
    inv.status !== 'expired' || 
    (inv.status === 'expired' && 
     new Date().getTime() - (inv.createdAt instanceof Date ? inv.createdAt.getTime() : inv.createdAt.toDate().getTime()) < 24 * 60 * 60 * 1000
    )
  )

  return (
    <div className="space-y-4">
      {(success || error || dataError) && (
        <div>
          {success && <Alert variant="success">{success}</Alert>}
          {(error || dataError) && <Alert variant="error">{error || dataError?.message || 'An error occurred'}</Alert>}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => reload()} loading={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredInvitations.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredInvitations.map((invitation) => (
            <div 
              key={invitation.id} 
              className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">
                      {invitation.inviteeEmail}
                    </h4>
                    {getInvitationStatusBadge(invitation)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    <p>Invited {getTimeAgo(invitation.createdAt)}</p>
                    <p>
                      Expires: {formatDate(invitation.expiresAt)}
                      {invitation.acceptedAt && (
                        <span className="ml-2">
                          • Accepted {getTimeAgo(invitation.acceptedAt)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Invitation Link */}
              {isActionable(invitation) && (
                <div className="bg-white p-3 rounded border mb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 mr-3">
                      <p className="text-xs text-gray-500 mb-1">Invitation Link:</p>
                      <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                        {generateInvitationLink(invitation.invitationCode)}
                      </p>
                    </div>
                    <Button
                      size="small"
                      type="default"
                      onClick={() => copyInvitationLink(invitation.invitationCode)}
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                {invitation.status === 'pending' && (
                  <>
                    <Button
                      size="small"
                      type="default"
                      onClick={() => handleResendInvitation(invitation)}
                      loading={actionLoading === invitation.id}
                      disabled={!!actionLoading}
                    >
                      Resend
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => handleCancelInvitation(invitation)}
                      loading={actionLoading === invitation.id}
                      disabled={!!actionLoading}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {invitation.status === 'accepted' && (
                  <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    ✓ User joined the group
                  </div>
                )}
                {(invitation.status === 'expired' || invitation.status === 'declined') && (
                  <Button
                    size="small"
                    type="default"
                    onClick={() => handleResendInvitation(invitation)}
                    loading={actionLoading === invitation.id}
                    disabled={!!actionLoading}
                  >
                    Send New Invitation
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">No invitations found</p>
          <p className="text-sm text-gray-400">
            Invitations will appear here when you send them to users
          </p>
        </div>
      )}

      {/* Summary */}
      {filteredInvitations.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Invitation Summary:
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-800 font-medium">
                {filteredInvitations.filter(i => i.status === 'pending').length}
              </span>
              <span className="text-blue-600 ml-1">Pending</span>
            </div>
            <div>
              <span className="text-blue-800 font-medium">
                {filteredInvitations.filter(i => i.status === 'accepted').length}
              </span>
              <span className="text-blue-600 ml-1">Accepted</span>
            </div>
            <div>
              <span className="text-blue-800 font-medium">
                {filteredInvitations.filter(i => i.status === 'declined').length}
              </span>
              <span className="text-blue-600 ml-1">Declined</span>
            </div>
            <div>
              <span className="text-blue-800 font-medium">
                {filteredInvitations.filter(i => {
                  const now = new Date()
                  const expiresAt = i.expiresAt instanceof Date ? i.expiresAt : i.expiresAt.toDate()
                  return i.status === 'expired' || now > expiresAt
                }).length}
              </span>
              <span className="text-blue-600 ml-1">Expired</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  onInviteUsers,
  onMemberClick
}) => {
  const [activeTab, setActiveTab] = useState('view-members')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showViewMembersModal, setShowViewMembersModal] = useState(false)
  
  // State for embedded members view
  const [members, setMembers] = useState<GroupMember[]>([])
  const [memberProfiles, setMemberProfiles] = useState<Map<string, UserProfile>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Invitation state
  const [invitations, setInvitations] = useState<GroupInvitation[]>([])
  const [showInvitationResults, setShowInvitationResults] = useState(false)
  const [emailAccountStatus, setEmailAccountStatus] = useState<Record<string, boolean>>({})

  const isAdmin = currentUser?.id === group.adminId

  useEffect(() => {
    if (isOpen && activeTab === 'view-members') {
      loadMembers()
    }
  }, [isOpen, activeTab, group.id])

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

    console.log('🔧 UI: Starting member deactivation for:', member.userName, member.userId)

    try {
      setRemovingMemberId(member.userId)
      setError(null)
      
      console.log('🔧 UI: Calling deactivateGroupMember function')
      await deactivateGroupMember(group.id, member.userId, currentUser?.id || '')
      
      console.log('🔧 UI: Deactivation completed, updating UI state')
      setSuccessMessage(`${member.userName} has been deactivated`)
      
      // Immediately update the local state to show deactivated status
      setMembers(prevMembers => 
        prevMembers.map(m => 
          m.userId === member.userId 
            ? { ...m, isActive: false, deactivatedAt: new Date(), deactivatedBy: currentUser?.id || '' }
            : m
        )
      )
      
      // Also reload members from server to ensure consistency
      console.log('🔧 UI: Reloading members from server')
      setTimeout(() => loadMembers(), 500)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('🔧 UI: Error deactivating member:', error)
      setError(error instanceof Error ? error.message : 'Failed to deactivate member')
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleActivateMember = async (member: GroupMember) => {
    if (!window.confirm(`Are you sure you want to activate ${member.userName}? They will regain access to all group activities.`)) {
      return
    }

    console.log('🔧 UI: Starting member activation for:', member.userName, member.userId)

    try {
      setRemovingMemberId(member.userId) // Reuse the same loading state
      setError(null)
      
      console.log('🔧 UI: Calling activateGroupMember function')
      await activateGroupMember(group.id, member.userId, currentUser?.id || '')
      
      console.log('🔧 UI: Activation completed, updating UI state')
      setSuccessMessage(`${member.userName} has been activated`)
      
      // Immediately update the local state to show activated status
      setMembers(prevMembers => 
        prevMembers.map(m => 
          m.userId === member.userId 
            ? { ...m, isActive: true, reactivatedAt: new Date(), reactivatedBy: currentUser?.id || '' }
            : m
        )
      )
      
      // Also reload members from server to ensure consistency
      console.log('🔧 UI: Reloading members from server')
      setTimeout(() => loadMembers(), 500)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('🔧 UI: Error activating member:', error)
      setError(error instanceof Error ? error.message : 'Failed to activate member')
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


  const closeSubModals = () => {
    setShowInviteModal(false)
    setShowViewMembersModal(false)
    // Reset invitation state
    setShowInvitationResults(false)
    resetInviteForm()
    setEmailAccountStatus({})
    setInvitations([])
  }

  // Invitation form setup
  const {
    values: inviteValues,
    errors: inviteErrors,
    isSubmitting: isInviteSubmitting,
    handleChange: handleInviteChange,
    handleSubmit: handleInviteSubmit,
    resetForm: resetInviteForm,
    setFieldError: setInviteFieldError,
  } = useForm<InviteUsersFormData>({
    initialValues: {
      emails: '',
    },
    validate: (values) => {
      const errors: { [key: string]: string } = {}
      
      if (!values.emails.trim()) {
        errors.emails = 'Please enter at least one email address'
        return errors
      }

      const emailList = values.emails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0)

      if (emailList.length === 0) {
        errors.emails = 'Please enter at least one email address'
        return errors
      }

      const invalidEmails = emailList.filter(email => !validateEmail(email))
      if (invalidEmails.length > 0) {
        errors.emails = `Invalid email addresses: ${invalidEmails.join(', ')}`
      }

      // Check if admin is trying to invite themselves
      if (currentUser?.email) {
        const adminEmail = emailList.find(email => email.toLowerCase() === currentUser.email!.toLowerCase())
        if (adminEmail) {
          errors.emails = 'You cannot invite yourself to the group'
        }
      }

      if (emailList.length > 10) {
        errors.emails = 'Maximum 10 email addresses allowed'
      }

      return errors
    },
    onSubmit: async (values) => {
      try {
        const emailList = values.emails
          .split(/[,\n]/)
          .map(email => email.trim().toLowerCase())
          .filter((email, index, arr) => email.length > 0 && arr.indexOf(email) === index) // Remove duplicates

        const result = await onInviteUsers(emailList)
        setInvitations(result)
        setShowInvitationResults(true)
        resetInviteForm()
      } catch (error) {
        setInviteFieldError('general', error instanceof Error ? error.message : 'Failed to send invitations')
      }
    },
  })

  const checkEmailAccounts = async (emails: string[]) => {
    const status: Record<string, boolean> = {}
    
    for (const email of emails) {
      const normalizedEmail = email.trim().toLowerCase()
      try {
        const user = await getUserByEmail(normalizedEmail)
        status[normalizedEmail] = !!user
      } catch (error) {
        console.error(`Error checking account for ${normalizedEmail}:`, error)
        status[normalizedEmail] = false
      }
    }
    
    setEmailAccountStatus(status)
  }

  const copyInvitationLink = async (invitationCode: string) => {
    const link = generateInvitationLink(invitationCode)
    try {
      await navigator.clipboard.writeText(link)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const tabItems = [
    {
      key: 'view-members',
      label: '👥 View All Members',
      children: (
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
                const isCurrentUser = member.userId === currentUser?.id
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

                      {/* Action buttons for admin (only for non-admin members, not current user) */}
                      {isAdmin && !isCurrentUser && member.role !== 'admin' && (
                        <div className="ml-4">
                          {member.isActive !== false ? (
                            <Button
                              size="small"
                              type="default"
                              onClick={() => handleDeactivateMember(member)}
                              loading={removingMemberId === member.userId}
                              className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                            >
                              {removingMemberId === member.userId ? 'Deactivating...' : '⏸️ Deactivate'}
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => handleActivateMember(member)}
                              loading={removingMemberId === member.userId}
                              className="bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700"
                            >
                              {removingMemberId === member.userId ? 'Activating...' : '▶️ Activate'}
                            </Button>
                          )}
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
      )
    }
  ]

  if (isAdmin) {
    tabItems.push(
      {
        key: 'invite-members',
        label: '📧 Invite New Members',
        children: showInvitationResults ? (
          <div className="space-y-4">
            <Alert variant="success">
              {invitations.length} invitation{invitations.length > 1 ? 's' : ''} sent successfully!
            </Alert>

            <p className="text-sm text-gray-600">
              Share these invitation links with the invited users:
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-sm text-gray-900">
                          {invitation.inviteeEmail}
                        </p>
                        {(invitation as any).hasAccount ? (
                          <Badge variant="success" size="sm">
                            ✓ Has Account
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            ⚠ No Account
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                        {generateInvitationLink(invitation.invitationCode)}
                      </p>
                      {(invitation as any).hasAccount && (
                        <p className="text-xs text-green-600 mt-1">
                          📧 User has been notified in-app
                        </p>
                      )}
                    </div>
                    <Button
                      size="small"
                      type="default"
                      onClick={() => copyInvitationLink(invitation.invitationCode)}
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                How it works:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Invitations expire in 7 days</li>
                <li>• Users must have an account to accept invitations</li>
                <li>• They can click the link or use the invitation code</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button onClick={() => setShowInvitationResults(false)}>
                Send More Invitations
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {inviteErrors.general && (
              <Alert variant="error">
                {inviteErrors.general}
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Addresses *
              </label>
              <textarea
                value={inviteValues.emails}
                onChange={(e) => {
                  handleInviteChange('emails')(e as any)
                  // Check accounts when user pauses typing
                  const emails = e.target.value
                    .split(/[,\n]/)
                    .map(email => email.trim())
                    .filter(email => email.length > 0 && validateEmail(email))
                  
                  if (emails.length > 0) {
                    const timeoutId = setTimeout(() => {
                      checkEmailAccounts(emails)
                    }, 500)
                    return () => clearTimeout(timeoutId)
                  }
                }}
                className={`
                  w-full px-3 py-2 border rounded-lg resize-none
                  focus:outline-none focus:ring-2 focus:border-transparent
                  ${inviteErrors.emails ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
                `}
                rows={6}
                placeholder="Enter email addresses (one per line or comma-separated)&#10;example@email.com&#10;another@email.com"
              />
              {inviteErrors.emails && (
                <p className="mt-1 text-sm text-red-600">{inviteErrors.emails}</p>
              )}
              
              {/* Email Status Preview */}
              {inviteValues.emails && Object.keys(emailAccountStatus).length > 0 && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Account Status Preview:</h4>
                  <div className="space-y-1">
                    {Object.entries(emailAccountStatus).map(([email, hasAccount]) => (
                      <div key={email} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{email}</span>
                        {hasAccount ? (
                          <Badge variant="success" size="sm">✓ Has Account</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">⚠ No Account</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="mt-1 text-sm text-gray-500">
                Enter up to 10 email addresses, separated by commas or new lines
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">
                📧 Note about invitations:
              </h4>
              <p className="text-sm text-yellow-800">
                Invitations will be sent as shareable links. Make sure the recipients have 
                accounts on Happy Points to accept the invitations.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="primary"
                loading={isInviteSubmitting}
                onClick={handleInviteSubmit}
              >
                Send Invitations
              </Button>
            </div>
          </div>
        )
      },
      {
        key: 'manage-invitations',
        label: '📋 Manage Invitations',
        children: <ManageInvitationsContent group={group} adminName={currentUser?.name || ''} />
      }
    )
  }

  return (
    <>
      <Modal
        title={`Member Management - ${group.name}`}
        open={isOpen}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        ]}
        width={600}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key)
            setShowInvitationResults(false) // Reset invitation results when switching tabs
          }}
          items={tabItems}
        />
      </Modal>

      {/* Sub-modals */}
      <InviteUsersModal
        isOpen={showInviteModal}
        onClose={closeSubModals}
        onInviteUsers={onInviteUsers}
        groupName={group.name}
        currentUserEmail={currentUser?.email}
      />
      
      
      <ViewMembersModal
        isOpen={showViewMembersModal}
        onClose={closeSubModals}
        group={group}
        currentUserId={currentUser?.id || ''}
        isAdmin={isAdmin}
        onMemberClick={onMemberClick}
      />
    </>
  )
}

export default MemberManagementModal