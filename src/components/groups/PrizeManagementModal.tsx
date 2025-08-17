'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Input, Form, Alert, Table, Popconfirm, Switch } from 'antd'
import { Group, GroupPrize, PrizeFormData } from '@/types'
import { getTaskStatusBadge } from '@/lib/utils/statusBadges'

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
  
  // Form state
  const [formValues, setFormValues] = useState<PrizeFormData>({
    title: '',
    description: '',
    pointsCost: '',
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

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

  const handleClose = () => {
    clearForm()
    onClose()
  }

  const columns = [
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

  return (
    <Modal
      title={`🏆 Manage Prizes - ${group.name}`}
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width={800}
      destroyOnClose
    >
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
          columns={columns}
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
    </Modal>
  )
}