'use client'

import React from 'react'
import { Card, Badge } from '@/components/ui'
import { Group } from '@/types'
import { formatDate } from '@/lib/utils'

interface GroupCardProps {
  group: Group
  isAdmin: boolean
  onClick?: () => void
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  isAdmin,
  onClick
}) => {
  const memberPercentage = (group.memberCount / group.maxMembers) * 100

  return (
    <div
      className="cursor-pointer transition-all duration-200 hover:border-blue-300"
      onClick={onClick}
    >
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
          <span>Code: {group.code}</span>
          <span>Created {formatDate(group.createdAt)}</span>
        </div>
      </div>
      </Card>
    </div>
  )
}

export default GroupCard