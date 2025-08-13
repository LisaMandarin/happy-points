'use client'

import React, { useState } from 'react'
import { Modal, Button, Alert, LoadingSpinner } from '@/components/ui'
import { GroupInvitation, Group } from '@/types'
import { 
  getGroupInvitations, 
  cancelInvitation, 
  resendInvitation,
  generateInvitationLink 
} from '@/lib/groups'
import { formatDate, getTimeAgo } from '@/lib/utils'
import { getInvitationStatusBadge } from '@/lib/utils/statusBadges'
import { useModalData } from '@/hooks/useModalData'

interface ManageInvitationsModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  adminName: string
}

const ManageInvitationsModal: React.FC<ManageInvitationsModalProps> = ({
  isOpen,
  onClose,
  group,
  adminName
}) => {
  const { data: invitations, loading, error: dataError, reload } = useModalData<GroupInvitation[]>({
    loadDataFn: () => getGroupInvitations(group.id),
    dependencies: [isOpen, group.id],
    errorMessage: 'Failed to load invitations'
  })

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleCancelInvitation = async (invitation: GroupInvitation) => {
    try {
      setActionLoading(invitation.id)
      setError(null)
      await cancelInvitation(invitation.id)
      setSuccess('Invitation cancelled successfully')
      await reload()
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
      await resendInvitation(
        invitation.id,
        group.id,
        group.name,
        group.adminId,
        adminName,
        invitation.inviteeEmail
      )
      setSuccess('Invitation resent successfully')
      await reload()
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Invitations - ${group.name}`}
      size="lg"
      footer={
        <div className="flex justify-between">
          <Button variant="outline" onClick={reload} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {(success || error || dataError) && (
          <div>
            {success && <Alert variant="success">{success}</Alert>}
            {(error || dataError) && <Alert variant="error">{error || dataError}</Alert>}
          </div>
        )}

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
                        size="sm"
                        variant="outline"
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
                        size="sm"
                        variant="outline"
                        onClick={() => handleResendInvitation(invitation)}
                        loading={actionLoading === invitation.id}
                        disabled={!!actionLoading}
                      >
                        Resend
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
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
                      size="sm"
                      variant="outline"
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
    </Modal>
  )
}

export default ManageInvitationsModal