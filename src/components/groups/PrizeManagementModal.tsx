'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Input, Form, Alert, Table, Popconfirm, Switch, Tabs, Tag } from 'antd'
import { Group, GroupPrize, PrizeFormData, PrizeRedemptionApplication } from '@/types'
import { getTaskStatusBadge, getApplicationStatusBadge } from '@/lib/utils/statusBadges'
import { useModalData } from '@/hooks/useModalData'
import { useApproveReject } from '@/hooks/useApproveReject'

interface PrizeManagementModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUser?: any
}

export default function PrizeManagementModal({
  isOpen,
  onClose,
  group,
  currentUser
}: PrizeManagementModalProps) {
  const [loading, setLoading] = useState(false)
  const [prizes, setPrizes] = useState<GroupPrize[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPrize, setEditingPrize] = useState<GroupPrize | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  
  // Form state
  const [formValues, setFormValues] = useState<PrizeFormData>({
    title: '',
    description: '',
    pointsCost: '',
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  // Redemption applications data
  const {
    data: applications,
    loading: applicationsLoading,
    error: applicationsError,
    reload: reloadApplications
  } = useModalData<PrizeRedemptionApplication[]>({
    loadDataFn: async () => {
      const { getGroupPrizeRedemptionApplications } = await import('@/lib/firestore')
      return getGroupPrizeRedemptionApplications(group.id)
    },
    dependencies: [isOpen && group?.id],
    errorMessage: 'Failed to load redemption applications'
  })

  // Approve/reject applications handler
  const {
    handleApprove,
    handleReject,
    approvingId,
    rejectingId,
    error: approveRejectError,
    successMessage
  } = useApproveReject({
    approveAction: async (id: string, adminId: string, adminName: string) => {
      const { approvePrizeRedemptionApplication } = await import('@/lib/firestore')
      await approvePrizeRedemptionApplication(id, adminId, adminName)
    },
    rejectAction: async (id: string, adminId: string, adminName: string, reason?: string) => {
      const { rejectPrizeRedemptionApplication } = await import('@/lib/firestore')
      await rejectPrizeRedemptionApplication(id, reason || '')
    },
    onProcessed: () => {},
    refreshData: reloadApplications,
    approveSuccessMessage: 'Application approved successfully!',
    rejectSuccessMessage: 'Application rejected.'
  })

  const clearForm = () => {
    setFormValues({
      title: '',
      description: '',
      pointsCost: '',
    })
    setFormErrors({})
    setEditingPrize(null)
    setShowCreateForm(false)
  }

  const loadPrizes = async () => {
    if (!group.id) return
    
    try {
      const { getGroupPrizes } = await import('@/lib/firestore')
      const groupPrizes = await getGroupPrizes(group.id)
      setPrizes(groupPrizes)
    } catch (error) {
      console.error('Error loading prizes:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadPrizes()
    }
  }, [isOpen, group.id])

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!formValues.title.trim()) {
      errors.title = 'Title is required'
    }

    if (!formValues.description.trim()) {
      errors.description = 'Description is required'
    }

    if (!formValues.pointsCost.trim()) {
      errors.pointsCost = 'Points cost is required'
    } else {
      const points = parseInt(formValues.pointsCost)
      if (isNaN(points) || points <= 0) {
        errors.pointsCost = 'Points cost must be a positive number'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreatePrize = async () => {
    if (!validateForm() || !currentUser) return

    setLoading(true)
    try {
      const { createGroupPrize } = await import('@/lib/firestore')
      
      await createGroupPrize({
        groupId: group.id,
        groupName: group.name,
        title: formValues.title.trim(),
        description: formValues.description.trim(),
        pointsCost: parseInt(formValues.pointsCost),
        createdBy: currentUser.id,
        createdByName: currentUser.name,
      })

      await loadPrizes()
      clearForm()
    } catch (error) {
      console.error('Error creating prize:', error)
      setFormErrors({ general: error instanceof Error ? error.message : 'Failed to create prize' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePrize = async () => {
    if (!validateForm() || !editingPrize) return

    setLoading(true)
    try {
      const { updateGroupPrize } = await import('@/lib/firestore')
      
      await updateGroupPrize(editingPrize.id, {
        title: formValues.title.trim(),
        description: formValues.description.trim(),
        pointsCost: parseInt(formValues.pointsCost),
      })

      await loadPrizes()
      clearForm()
    } catch (error) {
      console.error('Error updating prize:', error)
      setFormErrors({ general: error instanceof Error ? error.message : 'Failed to update prize' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (prize: GroupPrize) => {
    try {
      const { updateGroupPrize } = await import('@/lib/firestore')
      await updateGroupPrize(prize.id, { isActive: !prize.isActive })
      await loadPrizes()
    } catch (error) {
      console.error('Error toggling prize status:', error)
    }
  }

  const handleDeletePrize = async (prizeId: string) => {
    try {
      const { deleteGroupPrize } = await import('@/lib/firestore')
      await deleteGroupPrize(prizeId)
      await loadPrizes()
    } catch (error) {
      console.error('Error deleting prize:', error)
    }
  }

  const handleEditPrize = (prize: GroupPrize) => {
    setEditingPrize(prize)
    setFormValues({
      title: prize.title,
      description: prize.description,
      pointsCost: prize.pointsCost.toString(),
    })
    setShowCreateForm(true)
  }

  const handleApproveClick = async (application: PrizeRedemptionApplication) => {
    await handleApprove(application.id, currentUser.id, currentUser.name)
  }

  const handleRejectClick = async (application: PrizeRedemptionApplication) => {
    if (!rejectionReason.trim()) {
      return
    }
    await handleReject(application.id, currentUser.id, currentUser.name, rejectionReason)
    setRejectionReason('')
  }

  const handleClose = () => {
    clearForm()
    onClose()
  }

  const prizeColumns = [
    {
      title: 'Prize',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: GroupPrize) => (
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-gray-500">{record.description}</div>
        </div>
      ),
    },
    {
      title: 'Cost',
      dataIndex: 'pointsCost',
      key: 'pointsCost',
      render: (cost: number) => (
        <span className="font-medium text-blue-600">{cost} points</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: GroupPrize) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: GroupPrize) => (
        <div className="space-x-2">
          <Button
            size="small"
            onClick={() => handleEditPrize(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Prize"
            description="Are you sure you want to delete this prize?"
            onConfirm={() => handleDeletePrize(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              size="small"
              danger
            >
              Delete
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ]

  const applicationColumns = [
    {
      title: 'Member',
      dataIndex: 'userName',
      key: 'userName',
      render: (name: string) => (
        <span className="font-medium">{name}</span>
      ),
    },
    {
      title: 'Prize',
      key: 'prize',
      render: (_: any, record: PrizeRedemptionApplication) => (
        <div>
          <div className="font-medium">{record.prizeTitle}</div>
          <div className="text-sm text-gray-500">{record.prizeDescription}</div>
        </div>
      ),
    },
    {
      title: 'Points',
      dataIndex: 'pointsCost',
      key: 'pointsCost',
      render: (points: number) => (
        <span className="font-medium text-blue-600">{points} points</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: PrizeRedemptionApplication) => 
        getApplicationStatusBadge(status, record.rejectionReason),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => (
        <span className="text-sm text-gray-500">
          {new Date(date).toLocaleDateString()}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PrizeRedemptionApplication) => {
        if (record.status !== 'pending') {
          return null
        }
        
        return (
          <div className="space-x-2">
            <Popconfirm
              title="Approve Application"
              description="Are you sure you want to approve this redemption? Points will be deducted from the member."
              onConfirm={() => handleApproveClick(record)}
              okText="Approve"
              cancelText="Cancel"
            >
              <Button
                size="small"
                type="primary"
                loading={approvingId === record.id}
                disabled={rejectingId === record.id}
              >
                Approve
              </Button>
            </Popconfirm>
            
            <Popconfirm
              title="Reject Application"
              description={
                <div className="space-y-2">
                  <p>Please provide a reason for rejection:</p>
                  <Input.TextArea
                    placeholder="Enter rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              }
              onConfirm={() => handleRejectClick(record)}
              okText="Reject"
              cancelText="Cancel"
              okButtonProps={{ 
                disabled: !rejectionReason.trim(),
                danger: true 
              }}
            >
              <Button
                size="small"
                danger
                loading={rejectingId === record.id}
                disabled={approvingId === record.id}
              >
                Reject
              </Button>
            </Popconfirm>
          </div>
        )
      },
    },
  ]

  const pendingApplications = applications?.filter(app => app.status === 'pending') || []
  const processedApplications = applications?.filter(app => app.status !== 'pending') || []

  const tabItems = [
    {
      key: '1',
      label: 'Manage Prizes',
      children: (
        <div className="space-y-4">
          {formErrors.general && (
            <Alert
              message={formErrors.general}
              type="error"
              showIcon
              closable
              onClose={() => setFormErrors({ ...formErrors, general: '' })}
            />
          )}

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Group Prizes</h3>
            <Button 
              type="primary" 
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '+ Create Prize'}
            </Button>
          </div>

          {showCreateForm && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-medium mb-4">
                {editingPrize ? 'Edit Prize' : 'Create New Prize'}
              </h4>
              
              <Form layout="vertical">
                <Form.Item
                  label="Prize Title"
                  validateStatus={formErrors.title ? 'error' : ''}
                  help={formErrors.title}
                  required
                >
                  <Input
                    placeholder="Enter prize title"
                    value={formValues.title}
                    onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
                  />
                </Form.Item>

                <Form.Item
                  label="Description"
                  validateStatus={formErrors.description ? 'error' : ''}
                  help={formErrors.description}
                  required
                >
                  <Input.TextArea
                    placeholder="Enter prize description"
                    value={formValues.description}
                    onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                    rows={3}
                  />
                </Form.Item>

                <Form.Item
                  label="Points Cost"
                  validateStatus={formErrors.pointsCost ? 'error' : ''}
                  help={formErrors.pointsCost}
                  required
                >
                  <Input
                    type="number"
                    placeholder="Enter points required"
                    value={formValues.pointsCost}
                    onChange={(e) => setFormValues({ ...formValues, pointsCost: e.target.value })}
                    min="1"
                  />
                </Form.Item>

                <div className="flex space-x-2">
                  <Button
                    type="primary"
                    loading={loading}
                    onClick={editingPrize ? handleUpdatePrize : handleCreatePrize}
                  >
                    {editingPrize ? 'Update Prize' : 'Create Prize'}
                  </Button>
                  <Button onClick={clearForm}>
                    Cancel
                  </Button>
                </div>
              </Form>
            </div>
          )}

          <Table
            columns={prizeColumns}
            dataSource={prizes}
            rowKey="id"
            pagination={{ 
              pageSize: 10,
              showSizeChanger: false,
            }}
            locale={{ 
              emptyText: 'No prizes created yet. Create your first prize to get started!' 
            }}
          />

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Members can redeem these prizes using their earned points</p>
            <p>• Inactive prizes are hidden from members but can be reactivated</p>
            <p>• Deleting a prize permanently removes it from the system</p>
          </div>
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <span className="flex items-center gap-2">
          Review Applications
          {pendingApplications.length > 0 && (
            <Tag color="red" className="ml-1 text-xs">
              {pendingApplications.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <div className="space-y-6">
          {applicationsError && (
            <Alert
              message="Error loading applications"
              description={applicationsError}
              type="error"
              showIcon
              closable
            />
          )}

          {approveRejectError && (
            <Alert
              message="Error processing application"
              description={approveRejectError}
              type="error"
              showIcon
              closable
            />
          )}

          {successMessage && (
            <Alert
              message={successMessage}
              type="success"
              showIcon
              closable
            />
          )}

          {pendingApplications.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4 text-orange-600">
                Pending Applications ({pendingApplications.length})
              </h3>
              <Table
                columns={applicationColumns}
                dataSource={pendingApplications}
                rowKey="id"
                loading={applicationsLoading}
                pagination={false}
                className="border rounded-lg"
              />
            </div>
          )}

          {processedApplications.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-600">
                Processed Applications ({processedApplications.length})
              </h3>
              <Table
                columns={applicationColumns.filter(col => col.key !== 'actions')}
                dataSource={processedApplications}
                rowKey="id"
                loading={applicationsLoading}
                pagination={{ 
                  pageSize: 10,
                  showSizeChanger: false,
                }}
                className="border rounded-lg"
              />
            </div>
          )}

          {!applicationsLoading && applications?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No redemption applications found.</p>
              <p className="text-sm">Applications will appear here when members submit prize redemption requests.</p>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Approving an application will deduct points from the member and create a redemption record</p>
            <p>• Rejected applications can be viewed in the processed applications section</p>
            <p>• Members will be notified of your decision</p>
          </div>
        </div>
      ),
    },
  ]

  return (
    <Modal
      title={`🏆 Prize Management - ${group.name}`}
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width={1000}
      destroyOnClose
    >
      <Tabs defaultActiveKey="1" items={tabItems} />
    </Modal>
  )
}