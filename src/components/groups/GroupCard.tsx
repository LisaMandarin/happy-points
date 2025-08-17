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
  onPenaltyManagement?: () => void
  onApplyPenalties?: () => void
  onPrizeManagement?: () => void
  onPrizeRedemption?: () => void
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  currentUser,
  onMemberManagement,
  onTaskManagement,
  onAwardPoints,
  onPenaltyManagement,
  onApplyPenalties,
  onPrizeManagement,
  onPrizeRedemption
}) => {
  const memberPercentage = (group.memberCount / group.maxMembers) * 100
  const isAdmin = currentUser?.id === group.adminId
  const isUserDeactivated = group.isUserActive === false
  
  // Only fetch invitation count if user is admin and active
  const { data: invitationCount = 0 } = useGroupInvitationCount(isAdmin && !isUserDeactivated ? group.id : undefined)
  
  // Get pending items for this group (only if user is active)
  const { data: pendingItems = [] } = useUserPendingItems(!isUserDeactivated ? currentUser?.id : undefined, [group])
  const groupPendingCount = pendingItems.reduce((sum, item) => sum + (item.count || 0), 0)

  return (
    <div className="transition-all duration-200 relative">
      <Card hover={!isUserDeactivated} className={isUserDeactivated ? 'opacity-60' : ''}>
        {/* Deactivated overlay */}
        {isUserDeactivated && (
          <div className="absolute inset-0 bg-gray-500 bg-opacity-20 rounded-lg flex items-center justify-center z-10">
            <div className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm font-medium">
              Deactivated
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {group.name}
          </h3>
          <div className="flex space-x-2 flex-shrink-0 ml-2">
            {isAdmin && !isUserDeactivated && (
              <Badge variant="info" size="sm">
                Admin
              </Badge>
            )}
            {isUserDeactivated && (
              <Badge variant="warning" size="sm">
                Deactivated
              </Badge>
            )}
            {groupPendingCount > 0 && !isUserDeactivated && (
              <Badge variant="error" size="sm">
                {groupPendingCount} pending
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

          <div className="flex justify-end items-center text-xs text-gray-400">
            <span>Created {formatDate(group.createdAt)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        {!isUserDeactivated && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            {isAdmin ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onMemberManagement}
                    className="text-xs flex items-center justify-center"
                  >
                    👥 Members
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onTaskManagement}
                    className="text-xs flex items-center justify-center relative"
                  >
                    📝 Tasks
                    {pendingItems.some(item => item.actionType === 'task-applications') && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onPrizeManagement}
                    className="text-xs flex items-center justify-center"
                  >
                    🏆 Prizes
                  </Button>
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
                    onClick={onPenaltyManagement}
                    className="text-xs flex items-center justify-center"
                  >
                    🚨 Penalties
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onApplyPenalties}
                    className="text-xs flex items-center justify-center"
                  >
                    ⚡ Apply Penalties
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onMemberManagement}
                    className="text-xs flex items-center justify-center"
                  >
                    👥 Members
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onTaskManagement}
                    className="text-xs flex items-center justify-center relative"
                  >
                    📝 Tasks
                    {pendingItems.some(item => item.actionType === 'task-applications') && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onPrizeRedemption}
                    className="text-xs flex items-center justify-center"
                  >
                    🏆 Prizes
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onPenaltyManagement}
                    className="text-xs flex items-center justify-center"
                  >
                    🚨 Penalties
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      
        {/* Deactivated message */}
        {isUserDeactivated && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500">
              <p>You have been deactivated from this group</p>
              <p className="text-xs text-gray-400 mt-1">Contact the admin to reactivate your membership</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default GroupCard