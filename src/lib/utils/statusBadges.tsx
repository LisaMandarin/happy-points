import React from 'react'
import { Badge } from '@/components/ui'
import { GroupInvitation, GroupTask } from '@/types'

/**
 * Status badge for task applications and join requests (pending/approved/rejected)
 */
export const getApplicationStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="warning" size="sm">Pending</Badge>
    case 'approved':
      return <Badge variant="success" size="sm">Approved</Badge>
    case 'rejected':
      return <Badge variant="error" size="sm">Rejected</Badge>
    default:
      return <Badge variant="default" size="sm">{status}</Badge>
  }
}

/**
 * Status badge for group invitations with expiry logic
 */
export const getInvitationStatusBadge = (invitation: GroupInvitation) => {
  const now = new Date()
  const expiresAt = invitation.expiresAt instanceof Date 
    ? invitation.expiresAt 
    : invitation.expiresAt.toDate()

  if (invitation.status === 'accepted') {
    return <Badge variant="success" size="sm">Accepted</Badge>
  } else if (invitation.status === 'declined') {
    return <Badge variant="error" size="sm">Declined</Badge>
  } else if (invitation.status === 'expired' || now > expiresAt) {
    return <Badge variant="error" size="sm">Expired</Badge>
  } else {
    return <Badge variant="info" size="sm">Pending</Badge>
  }
}

/**
 * Status badge for tasks (active/inactive)
 */
export const getTaskStatusBadge = (task: GroupTask) => {
  if (task.isActive) {
    return <Badge variant="success" size="sm">Active</Badge>
  } else {
    return <Badge variant="default" size="sm">Inactive</Badge>
  }
}