'use client'

import React from 'react'
import { Card, Badge, Button } from '@/components/ui'
import { Group, UserProfile } from '@/types'
import { formatDate } from '@/lib/utils'
import { useGroupInvitationCount } from '@/hooks/queries/useGroups'
import { useUserPendingItems } from '@/hooks/queries/usePendingItems'

interface GroupCardProps {
  group: Group
  currentUser: UserProfile | null
  onMemberManagement?: () => void
  onTaskManagement?: () => void
  onAwardPoints?: () => void
  onReviewRequests?: () => void
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  currentUser,
  onMemberManagement,
  onTaskManagement,
  onAwardPoints,
  onReviewRequests
}) => {
  const memberPercentage = (group.memberCount / group.maxMembers) * 100
  const isAdmin = currentUser?.id === group.adminId
  
  // Only fetch invitation count if user is admin
  const { data: invitationCount = 0 } = useGroupInvitationCount(isAdmin ? group.id : undefined)
  
  // Get pending items for this group
  const { data: pendingItems = [] } = useUserPendingItems(currentUser?.id, [group])
  const groupPendingCount = pendingItems.reduce((sum, item) => sum + (item.count || 0), 0)

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
          {groupPendingCount > 0 && (
            <Badge variant="error" size="sm">
              {groupPendingCount} pending
            </Badge>
          )}
          <Badge variant="default" size="sm">
            Invitation Only
          </Badge>
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
          <span>Invitation Only</span>
          <span>Created {formatDate(group.createdAt)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onMemberManagement}
            className="text-xs flex items-center justify-center"
          >
            👥 Member Management
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={onTaskManagement}
            className="text-xs flex items-center justify-center relative"
          >
            📝 Task Management
            {pendingItems.some(item => item.actionType === 'task-applications') && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            )}
          </Button>
          {isAdmin && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onAwardPoints}
                className="text-xs flex items-center justify-center"
              >
                🎁 Award Points
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onReviewRequests}
                className="text-xs flex items-center justify-center relative"
              >
                ✅ Review Requests
                {pendingItems.some(item => item.actionType === 'join-requests') && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
      </Card>
    </div>
  )
}

export default GroupCard