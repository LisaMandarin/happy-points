'use client'

import React from 'react'
import { Modal, Button, Alert, LoadingSpinner, Badge } from '@/components/ui'
import { Group, UserProfile } from '@/types'
import { useGroupPenaltyTypes } from '@/hooks/queries/useGroups'
import { formatDate } from '@/lib/utils'

interface PenaltyViewModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUser: UserProfile | null
}

const PenaltyViewModal: React.FC<PenaltyViewModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser
}) => {
  const { 
    data: penaltyTypes = [], 
    isLoading: loadingPenaltyTypes, 
    error: loadErrorPenaltyTypes 
  } = useGroupPenaltyTypes(isOpen ? group.id : undefined)

  const isAdmin = currentUser?.id === group.adminId
  
  // Filter to show only active penalty types
  const activePenaltyTypes = penaltyTypes.filter(penaltyType => penaltyType.isActive)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Penalty Types - ${group.name}`}
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <h3 className="text-lg font-medium text-gray-900">📋 Available Penalty Types</h3>
          {activePenaltyTypes.length > 0 && (
            <Badge variant="warning" size="sm">
              {activePenaltyTypes.length} types
            </Badge>
          )}
          <Badge variant={isAdmin ? "success" : "info"} size="sm">
            {isAdmin ? "Admin View" : "Member View"}
          </Badge>
        </div>

        {loadingPenaltyTypes ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-2 text-gray-600">Loading penalty types...</span>
          </div>
        ) : loadErrorPenaltyTypes ? (
          <div className="text-center py-8">
            <Alert variant="error">
              Failed to load penalty types. Please try again.
            </Alert>
          </div>
        ) : activePenaltyTypes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No penalty types</h3>
            <p className="text-gray-500">
              {isAdmin 
                ? "No penalty types have been created yet. Use 'Manage Penalties' to create penalty types."
                : "No penalty types are available in this group yet."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activePenaltyTypes.map((penaltyType) => (
              <div
                key={penaltyType.id}
                className="bg-orange-50 border border-orange-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-900 mb-1">
                      {penaltyType.title}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-orange-700">
                      <span>
                        <span className="font-medium">Created:</span> {formatDate(penaltyType.createdAt)}
                      </span>
                      <span>
                        <span className="font-medium">Created by:</span> {penaltyType.createdByName}
                      </span>
                      <span>
                        <Badge variant="success" size="sm">
                          Active
                        </Badge>
                      </span>
                    </div>
                  </div>
                  <Badge variant="warning" size="sm">
                    -{penaltyType.amount} points
                  </Badge>
                </div>
                
                <div className="bg-white p-3 rounded border border-orange-100">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {penaltyType.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activePenaltyTypes.length > 0 && (
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-orange-900 mb-2">
              Penalty Types Summary:
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-orange-800 font-medium">
                  {activePenaltyTypes.length}
                </span>
                <span className="text-orange-600 ml-1">
                  {activePenaltyTypes.length === 1 ? 'Type' : 'Types'} Available
                </span>
              </div>
              <div>
                <span className="text-orange-800 font-medium">
                  {Math.min(...activePenaltyTypes.map(pt => pt.amount))} - {Math.max(...activePenaltyTypes.map(pt => pt.amount))}
                </span>
                <span className="text-orange-600 ml-1">Points Range</span>
              </div>
            </div>
            {!isAdmin && activePenaltyTypes.length > 0 && (
              <div className="mt-3 text-xs text-orange-600">
                <p>
                  ℹ️ These are the penalty types that can be applied by group administrators.
                  Contact your admin if you have questions about group rules.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default PenaltyViewModal