'use client'

import React from 'react'
import { Card, Badge, Button } from 'antd'
import { BellOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { Group, UserProfile } from '@/types'
import { useUserPendingItems } from '@/hooks/queries/usePendingItems'
import { formatDate } from '@/lib/utils'

interface PendingActionsPanelProps {
  currentUser: UserProfile | null
  groups: Group[]
  onReviewRequests?: (group: Group) => void
  onViewApplications?: (group: Group) => void
}

const PendingActionsPanel: React.FC<PendingActionsPanelProps> = ({
  currentUser,
  groups,
  onReviewRequests,
  onViewApplications
}) => {
  const { data: pendingItems = [], isLoading } = useUserPendingItems(currentUser?.id, groups)

  if (isLoading) {
    return (
      <Card title="📋 Pending Actions" className="mb-6">
        <div className="text-center py-4 text-gray-500">Loading pending items...</div>
      </Card>
    )
  }

  if (pendingItems.length === 0) {
    return (
      <Card title="📋 Pending Actions" className="mb-6">
        <div className="text-center py-4 text-gray-500">
          <BellOutlined className="text-2xl mb-2 block" />
          <p>No pending actions</p>
          <p className="text-xs">You're all caught up!</p>
        </div>
      </Card>
    )
  }

  const adminActions = pendingItems.filter(item => item.type === 'admin')
  const userActions = pendingItems.filter(item => item.type === 'user')

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            📋 Pending Actions
            {pendingItems.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {pendingItems.reduce((sum, item) => sum + (item.count || 1), 0)} items
              </span>
            )}
          </span>
        </div>
      } 
      className="mb-6"
    >
      <div className="space-y-4">
        {/* Admin Actions */}
        {adminActions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <CheckOutlined className="mr-2 text-blue-500" />
              Admin Actions Required ({adminActions.reduce((sum, item) => sum + (item.count || 1), 0)})
            </h4>
            <div className="space-y-2">
              {adminActions.map((item, index) => (
                <div key={index} className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500 relative">
                  {(item.count || 0) > 1 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                      {item.count}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-blue-700">{item.description}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Group: {item.groupName} • {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {item.actionType === 'join-requests' && (
                        <Button 
                          size="small" 
                          type="primary"
                          onClick={() => item.group && onReviewRequests?.(item.group)}
                        >
                          Review
                        </Button>
                      )}
                      {item.actionType === 'task-applications' && (
                        <Button 
                          size="small" 
                          type="primary"
                          onClick={() => item.group && onViewApplications?.(item.group)}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Actions */}
        {userActions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <BellOutlined className="mr-2 text-green-500" />
              Your Actions ({userActions.reduce((sum, item) => sum + (item.count || 1), 0)})
            </h4>
            <div className="space-y-2">
              {userActions.map((item, index) => (
                <div key={index} className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500 relative">
                  {(item.count || 0) > 1 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                      {item.count}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-green-700">{item.description}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {item.groupName && `Group: ${item.groupName} • `}{formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {item.actionType === 'group-invitation' && (
                        <div className="text-xs text-green-600">
                          Check your email for the invitation link
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default PendingActionsPanel