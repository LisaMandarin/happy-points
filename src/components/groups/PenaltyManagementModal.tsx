'use client'

import React, { useState, useEffect } from 'react'
import { Collapse, Tabs } from 'antd'
import { Modal, Button, Alert, LoadingSpinner, Badge } from '@/components/ui'
import { Group, UserProfile, GroupPenalty, GroupPenaltyType } from '@/types'
import { useGroupPenalties, useGroupPenaltyTypes, useCreatePenaltyType, useDeletePenaltyType, useUpdatePenaltyType } from '@/hooks/queries/useGroups'
import { formatDate } from '@/lib/utils'
import { getPenaltyTypeStatusBadge } from '@/lib/utils/statusBadges'
import PenaltyModal from './PenaltyModal'

interface PenaltyManagementModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUser: UserProfile | null
  onApplyPenalty: (memberId: string, title: string, description: string, amount: number) => Promise<void>
}

const PenaltyManagementModal: React.FC<PenaltyManagementModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  onApplyPenalty
}) => {
  const [showPenaltyModal, setShowPenaltyModal] = useState(false)
  const [editingPenaltyType, setEditingPenaltyType] = useState<GroupPenaltyType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('manage')

  const isAdmin = currentUser?.id === group.adminId

  // Load penalty types for both admins and members
  const { 
    data: penaltyTypes = [], 
    isLoading: loadingTypes, 
    error: loadErrorTypes,
    refetch: reloadPenaltyTypes
  } = useGroupPenaltyTypes(isOpen ? group.id : undefined)

  // Load applied penalties only for admins
  const { 
    data: appliedPenalties = [], 
    isLoading: loadingPenalties, 
    error: loadErrorPenalties,
    refetch: reloadAppliedPenalties
  } = useGroupPenalties(isAdmin && isOpen ? group.id : undefined)

  const handleCreatePenalty = () => {
    setShowPenaltyModal(true)
  }

  const createPenaltyTypeMutation = useCreatePenaltyType()
  const deletePenaltyTypeMutation = useDeletePenaltyType()
  const updatePenaltyTypeMutation = useUpdatePenaltyType()

  const handlePenaltyCreated = async (memberId: string, title: string, description: string, amount: number) => {
    try {
      setError(null)
      await onApplyPenalty(memberId, title, description, amount)
      setSuccessMessage('Penalty applied successfully!')
      setShowPenaltyModal(false)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
      
      // Reload applied penalties to show the new one
      reloadAppliedPenalties()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to apply penalty')
    }
  }

  const handleCreatePenaltyType = async (title: string, description: string, amount: number) => {
    console.log(`PenaltyManagementModal: handleCreatePenaltyType called - ${title}, ${amount} points`)
    
    if (!currentUser) {
      console.error('PenaltyManagementModal: No current user found')
      return
    }
    
    try {
      setError(null)
      console.log('PenaltyManagementModal: Calling createPenaltyTypeMutation.mutateAsync')
      
      await createPenaltyTypeMutation.mutateAsync({
        groupId: group.id,
        groupName: group.name,
        title,
        description,
        amount,
        createdBy: currentUser.id,
        createdByName: currentUser.name
      })
      
      console.log('PenaltyManagementModal: Penalty type created successfully')
      setSuccessMessage(`Penalty type "${title}" created successfully!`)
      setShowPenaltyModal(false)
      
      // Reload penalty types to show the new one
      reloadPenaltyTypes()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('PenaltyManagementModal: Error creating penalty type:', error)
      setError(error instanceof Error ? error.message : 'Failed to create penalty type')
    }
  }

  const handleDeletePenaltyType = async (penaltyTypeId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the penalty type "${title}"?`)) {
      return
    }

    try {
      setActionLoading(penaltyTypeId)
      setError(null)
      console.log(`PenaltyManagementModal: Deleting penalty type ${penaltyTypeId}`)
      
      await deletePenaltyTypeMutation.mutateAsync({
        penaltyTypeId,
        groupId: group.id
      })
      
      console.log('PenaltyManagementModal: Penalty type deleted successfully')
      setSuccessMessage(`Penalty type "${title}" deleted successfully!`)
      
      // Reload penalty types to reflect the deletion
      reloadPenaltyTypes()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('PenaltyManagementModal: Error deleting penalty type:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete penalty type')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditPenaltyType = (penaltyType: GroupPenaltyType) => {
    setEditingPenaltyType(penaltyType)
    setShowPenaltyModal(true)
  }

  const handleEditPenaltyTypeSubmit = async (penaltyTypeId: string, title: string, description: string, amount: number) => {
    try {
      setError(null)
      console.log(`PenaltyManagementModal: Editing penalty type ${penaltyTypeId}`)
      
      await updatePenaltyTypeMutation.mutateAsync({
        penaltyTypeId,
        groupId: group.id,
        updateData: { title, description, amount }
      })
      
      console.log('PenaltyManagementModal: Penalty type edited successfully')
      setSuccessMessage(`Penalty type "${title}" updated successfully!`)
      setShowPenaltyModal(false)
      setEditingPenaltyType(null)
      
      // Reload penalty types to show the changes
      reloadPenaltyTypes()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('PenaltyManagementModal: Error editing penalty type:', error)
      setError(error instanceof Error ? error.message : 'Failed to edit penalty type')
    }
  }

  const handleToggleActive = async (penaltyType: GroupPenaltyType) => {
    try {
      setActionLoading(penaltyType.id)
      setError(null)
      
      await updatePenaltyTypeMutation.mutateAsync({
        penaltyTypeId: penaltyType.id,
        groupId: group.id,
        updateData: { isActive: !penaltyType.isActive }
      })
      
      setSuccessMessage(`Penalty type "${penaltyType.title}" ${penaltyType.isActive ? 'deactivated' : 'activated'} successfully!`)
      
      // Reload penalty types to reflect the change
      reloadPenaltyTypes()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('PenaltyManagementModal: Error toggling penalty type:', error)
      setError(error instanceof Error ? error.message : 'Failed to update penalty type')
    } finally {
      setActionLoading(null)
    }
  }

  const handleClose = () => {
    setShowPenaltyModal(false)
    setEditingPenaltyType(null)
    setError(null)
    setSuccessMessage(null)
    setActiveTab('manage')
    onClose()
  }

  // Render management tab content (admin only)
  const renderManagementTab = () => {
    if (loadingTypes) {
      return (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
          <span className="ml-2 text-gray-600">Loading penalty types...</span>
        </div>
      )
    }

    if (loadErrorTypes) {
      return (
        <div className="text-center py-8">
          <Alert variant="error">
            Failed to load penalty types. Please try again.
          </Alert>
          <Button 
            variant="outline" 
            onClick={() => reloadPenaltyTypes()} 
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )
    }

    if (penaltyTypes.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No penalty types yet</h3>
          <p className="text-gray-500 mb-4">
            Create penalty types to standardize penalties for your group members.
          </p>
          <Button
            variant="primary"
            onClick={handleCreatePenalty}
            className="bg-red-600 border-red-600 hover:bg-red-700"
          >
            Create First Penalty Type
          </Button>
        </div>
      )
    }

    return (
      <>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <Collapse
            ghost
            size="small"
            items={penaltyTypes.map((penaltyType) => ({
              key: penaltyType.id,
              label: (
                <div className={`flex items-center justify-between w-full pr-4 ${
                  !penaltyType.isActive ? 'opacity-75' : ''
                }`}>
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${
                      penaltyType.isActive ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {penaltyType.isActive ? penaltyType.title : (
                        <span className="line-through">{penaltyType.title}</span>
                      )}
                    </span>
                    {getPenaltyTypeStatusBadge(penaltyType)}
                    <Badge variant="error" size="sm">
                      -{penaltyType.amount} points
                    </Badge>
                  </div>
                  <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      onClick={() => handleEditPenaltyType(penaltyType)}
                      disabled={!!actionLoading}
                    >
                      Edit
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={penaltyType.isActive ? "outline" : "primary"}
                      onClick={() => handleToggleActive(penaltyType)}
                      loading={actionLoading === penaltyType.id}
                      disabled={!!actionLoading}
                    >
                      {penaltyType.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => handleDeletePenaltyType(penaltyType.id, penaltyType.title)}
                      loading={actionLoading === penaltyType.id}
                      disabled={!!actionLoading}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ),
              children: (
                <div className="text-sm text-gray-600 space-y-3 pt-2">
                  <div className="flex items-center space-x-4">
                    <span>
                      <span className="font-medium text-gray-700">Created by:</span>{' '}
                      {penaltyType.createdByName}
                    </span>
                    <span>
                      <span className="font-medium text-gray-700">Date:</span>{' '}
                      {formatDate(penaltyType.createdAt)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="mt-1 text-gray-600 bg-gray-50 p-3 rounded text-sm leading-relaxed">
                      {penaltyType.description}
                    </p>
                  </div>
                </div>
              )
            }))}
            className="bg-white border border-gray-200 rounded-lg shadow-sm"
          />
        </div>

        {penaltyTypes.length > 0 && (
          <div className="bg-red-50 p-4 rounded-lg mt-4">
            <h4 className="text-sm font-medium text-red-900 mb-2">
              Penalty Type Summary:
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-red-800 font-medium">
                  {penaltyTypes.filter(pt => pt.isActive).length}
                </span>
                <span className="text-red-600 ml-1">Active</span>
              </div>
              <div>
                <span className="text-red-800 font-medium">
                  {penaltyTypes.filter(pt => !pt.isActive).length}
                </span>
                <span className="text-red-600 ml-1">Inactive</span>
              </div>
              <div>
                <span className="text-red-800 font-medium">
                  {appliedPenalties.length}
                </span>
                <span className="text-red-600 ml-1">Applied</span>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Render view tab content (for both admin and members)
  const renderViewTab = () => {
    if (loadingTypes) {
      return (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
          <span className="ml-2 text-gray-600">Loading penalty types...</span>
        </div>
      )
    }

    if (loadErrorTypes) {
      return (
        <div className="text-center py-8">
          <Alert variant="error">
            Failed to load penalty types. Please try again.
          </Alert>
          <Button 
            variant="outline" 
            onClick={() => reloadPenaltyTypes()} 
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )
    }

    const activePenaltyTypes = penaltyTypes.filter(pt => pt.isActive)

    if (activePenaltyTypes.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No penalty types</h3>
          <p className="text-gray-500">
            {isAdmin 
              ? "No penalty types are available yet. Create penalty types in the 'Manage' tab."
              : "No penalty types are available in this group yet."
            }
          </p>
        </div>
      )
    }

    return (
      <>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <Collapse
            ghost
            size="small"
            items={activePenaltyTypes.map((penaltyType) => ({
              key: penaltyType.id,
              label: (
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {penaltyType.title}
                    </span>
                    <Badge variant="error" size="sm">
                      -{penaltyType.amount} points
                    </Badge>
                  </div>
                </div>
              ),
              children: (
                <div className="text-sm text-gray-600 space-y-3 pt-2">
                  <div className="flex items-center space-x-4">
                    <span>
                      <span className="font-medium text-gray-700">Created by:</span>{' '}
                      {penaltyType.createdByName}
                    </span>
                    <span>
                      <span className="font-medium text-gray-700">Date:</span>{' '}
                      {formatDate(penaltyType.createdAt)}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="mt-1 text-gray-600 bg-gray-50 p-3 rounded text-sm leading-relaxed">
                      {penaltyType.description}
                    </p>
                  </div>
                </div>
              )
            }))}
            className="bg-white border border-gray-200 rounded-lg shadow-sm"
          />
        </div>

        {activePenaltyTypes.length > 0 && (
          <div className="bg-orange-50 p-4 rounded-lg mt-4">
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
      </>
    )
  }

  // Create tab items based on user permissions
  const createTabItems = () => {
    const items = []
    
    // Add management tab for admins
    if (isAdmin) {
      items.push({
        key: 'manage',
        label: '🔧 Manage Penalty Types',
        children: (
          <div className="space-y-4">
            {renderManagementTab()}
          </div>
        )
      })
    }
    
    // Add view tab for all users
    items.push({
      key: 'view',
      label: '👁️ View Penalty Types',
      children: (
        <div className="space-y-4">
          {renderViewTab()}
        </div>
      )
    })
    
    return items
  }
  
  // Set default active tab based on user role
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(isAdmin ? 'manage' : 'view')
    }
  }, [isOpen, isAdmin])

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`Penalty Types - ${group.name}`}
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            {isAdmin && activeTab === 'manage' && (
              <Button
                variant="primary"
                onClick={handleCreatePenalty}
                className="bg-red-600 border-red-600 hover:bg-red-700"
              >
                + Create New Penalty Type
              </Button>
            )}
            {(!isAdmin || activeTab !== 'manage') && <div></div>}
            <Button variant="outline" onClick={handleClose}>
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

          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key)
              setError(null)
              setSuccessMessage(null)
            }}
            items={createTabItems()}
          />
        </div>
      </Modal>

      {/* Penalty Creation/Edit Modal */}
      <PenaltyModal
        isOpen={showPenaltyModal}
        onClose={() => {
          setShowPenaltyModal(false)
          setEditingPenaltyType(null)
        }}
        mode={editingPenaltyType ? "edit" : "create"}
        member={null}
        onCreatePenaltyType={handleCreatePenaltyType}
        onEditPenaltyType={handleEditPenaltyTypeSubmit}
        editingPenaltyType={editingPenaltyType ? {
          id: editingPenaltyType.id,
          title: editingPenaltyType.title,
          description: editingPenaltyType.description,
          amount: editingPenaltyType.amount
        } : undefined}
      />
    </>
  )
}

export default PenaltyManagementModal