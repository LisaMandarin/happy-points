'use client'

import React from 'react'
import { Card, Badge, Button } from '@/components/ui'
import { Group, UserProfile } from '@/types'
import { formatDate } from '@/lib/utils'
import { useGroupInvitationCount } from '@/hooks/queries/useGroups'

interface GroupCardProps {
  group: Group
  currentUser: UserProfile | null
  onInviteUsers?: () => void
  onManageInvitations?: () => void
  onViewMembers?: () => void
  onCreateTask?: () => void
  onManageTasks?: () => void
  onViewApplications?: () => void
  onReviewRequests?: () => void
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  currentUser,
  onInviteUsers,
  onManageInvitations,
  onViewMembers,
  onCreateTask,
  onManageTasks,
  onViewApplications,
  onReviewRequests
}) => {
  const memberPercentage = (group.memberCount / group.maxMembers) * 100
  const isAdmin = currentUser?.id === group.adminId
  
  // Only fetch invitation count if user is admin
  const { data: invitationCount = 0 } = useGroupInvitationCount(isAdmin ? group.id : undefined)

  return (
    <div className="transition-all duration-200">
      <Card hover>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {group.name}
        </h3>
        <div className="flex space-x-2 flex-shrink-0 ml-2">
          {isAdmin && (
            <Badge variant="info" size="sm">
              Admin
            </Badge>
          )}
          {group.isPrivate && (
            <Badge variant="warning" size="sm">
              Private
            </Badge>
          )}
        </div>
      </div>

      {group.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {group.description}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Members</span>
          <span>{group.memberCount}/{group.maxMembers}</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${memberPercentage}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-gray-400">
          {!group.isPrivate ? (
            <span>Code: {group.code}</span>
          ) : (
            <span>Private Group</span>
          )}
          <span>Created {formatDate(group.createdAt)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        {isAdmin ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              <Button 
                size="sm" 
                variant="outline"
                onClick={onViewMembers}
                className="text-xs"
              >
                👥 Members
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onInviteUsers}
                className="text-xs"
              >
                📧 Invite
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onManageInvitations}
                className="text-xs"
              >
                📋 Invites{invitationCount > 0 && ` (${invitationCount})`}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button 
                size="sm" 
                variant="outline"
                onClick={onCreateTask}
                className="text-xs"
              >
                ➕ Task
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onManageTasks}
                className="text-xs"
              >
                📝 Manage
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onViewApplications}
                className="text-xs"
              >
                📋 Review
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button 
                size="sm" 
                variant="outline"
                onClick={onReviewRequests}
                className="text-xs"
              >
                ✅ Requests
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={onViewMembers}
              className="text-xs"
            >
              👥 View Members
            </Button>
          </div>
        )}
      </div>
      </Card>
    </div>
  )
}

export default GroupCard