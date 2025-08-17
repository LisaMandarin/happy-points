'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Input, Select, Form, Alert, Radio } from 'antd'
import { Group } from '@/types'

interface RedeemPrizesModalProps {
  isOpen: boolean
  onClose: () => void
  memberGroups: Group[]
  currentUser?: any
  onRedeemPrize: (groupId: string, description: string, amount: number) => Promise<void>
}

interface RedeemFormData {
  groupId: string
  prizeType: 'preset' | 'custom'
  presetPrize: string
  customDescription: string
  customAmount: string
  general?: string
}

// Common prize templates
const PRESET_PRIZES = [
  { label: 'Coffee/Tea - 50 points', value: 'coffee', description: 'Coffee or Tea', amount: 50 },
  { label: 'Lunch treat - 100 points', value: 'lunch', description: 'Lunch treat', amount: 100 },
  { label: 'Movie ticket - 150 points', value: 'movie', description: 'Movie ticket', amount: 150 },
  { label: 'Gift card ($10) - 200 points', value: 'giftcard10', description: 'Gift card ($10)', amount: 200 },
  { label: 'Gift card ($25) - 500 points', value: 'giftcard25', description: 'Gift card ($25)', amount: 500 },
  { label: 'Day off - 1000 points', value: 'dayoff', description: 'Day off', amount: 1000 },
]

export default function RedeemPrizesModal({
  isOpen,
  onClose,
  memberGroups = [],
  currentUser,
  onRedeemPrize
}: RedeemPrizesModalProps) {
  const [loading, setLoading] = useState(false)
  const [groupMembers, setGroupMembers] = useState<{ [groupId: string]: any }>({})
  
  // Form state
  const [values, setValues] = useState<RedeemFormData>({
    groupId: '',
    prizeType: 'preset',
    presetPrize: '',
    customDescription: '',
    customAmount: '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const setValue = (field: keyof RedeemFormData, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }))
    // Clear error when value changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const setError = (field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const clearError = (field: string) => {
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const resetForm = () => {
    setValues({
      groupId: '',
      prizeType: 'preset',
      presetPrize: '',
      customDescription: '',
      customAmount: '',
    })
    setErrors({})
  }

  const isValid = () => {
    return values.groupId && 
           ((values.prizeType === 'preset' && values.presetPrize) ||
            (values.prizeType === 'custom' && values.customDescription && values.customAmount))
  }

  const loadGroupMembers = async () => {
    if (!currentUser?.id || !memberGroups || memberGroups.length === 0) return
    
    try {
      const { getGroupMembers } = await import('@/lib/groups')
      const membersData: { [groupId: string]: any } = {}
      
      for (const group of memberGroups) {
        const members = await getGroupMembers(group.id)
        const userMember = members.find((m: any) => m.userId === currentUser.id)
        if (userMember) {
          membersData[group.id] = userMember
        }
      }
      
      setGroupMembers(membersData)
    } catch (error) {
      console.error('Error loading group members:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadGroupMembers()
    }
  }, [isOpen, currentUser?.id, memberGroups])

  const handleSubmit = async () => {
    if (!isValid()) return

    if (!values.groupId) {
      setError('general', 'Please select a group')
      return
    }

    const selectedGroup = memberGroups.find(g => g.id === values.groupId)
    const userMember = groupMembers && groupMembers[values.groupId]
    
    if (!selectedGroup || !userMember) {
      setError('general', 'Group or member data not available')
      return
    }

    let description: string
    let amount: number

    if (values.prizeType === 'preset') {
      const selectedPreset = PRESET_PRIZES.find(p => p.value === values.presetPrize)
      if (!selectedPreset) {
        setError('general', 'Please select a prize')
        return
      }
      description = selectedPreset.description
      amount = selectedPreset.amount
    } else {
      if (!values.customDescription?.trim()) {
        setError('customDescription', 'Description is required')
        return
      }
      const customAmount = parseInt(values.customAmount || '')
      if (isNaN(customAmount) || customAmount <= 0) {
        setError('customAmount', 'Amount must be a positive number')
        return
      }
      description = values.customDescription?.trim() || ''
      amount = customAmount
    }

    // Check if user has enough points
    const currentPoints = (userMember.pointsEarned || 0) - (userMember.pointsRedeemed || 0)
    if (currentPoints < amount) {
      setError('general', `Insufficient points. You have ${currentPoints} points but need ${amount} points.`)
      return
    }

    setLoading(true)
    clearError('general')

    try {
      await onRedeemPrize(values.groupId, description, amount)
      resetForm()
      onClose()
    } catch (error) {
      console.error('Error redeeming prize:', error)
      setError('general', error instanceof Error ? error.message : 'Failed to redeem prize')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const selectedGroupMember = (values.groupId && groupMembers) ? groupMembers[values.groupId] : null
  const availablePoints = selectedGroupMember ? 
    ((selectedGroupMember.pointsEarned || 0) - (selectedGroupMember.pointsRedeemed || 0)) : 0

  return (
    <Modal
      title="🎁 Redeem Prizes"
      open={isOpen}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button
          key="redeem"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          disabled={!isValid()}
        >
          Redeem Prize
        </Button>
      ]}
      width={600}
      destroyOnClose
    >
      <div className="space-y-4">
        {errors.general && (
          <Alert
            message={errors.general}
            type="error"
            showIcon
            closable
            onClose={() => clearError('general')}
          />
        )}

        <Form layout="vertical">
          <Form.Item
            label="Select Group"
            validateStatus={errors.groupId ? 'error' : ''}
            help={errors.groupId}
            required
          >
            <Select
              placeholder="Choose a group to redeem from"
              value={values.groupId || undefined}
              onChange={(value) => setValue('groupId', value)}
            >
              {memberGroups && memberGroups.map((group) => {
                const groupMember = groupMembers && groupMembers[group.id]
                const points = groupMember ? 
                  ((groupMember.pointsEarned || 0) - (groupMember.pointsRedeemed || 0)) : 0
                
                return (
                  <Select.Option key={group.id} value={group.id}>
                    {group.name}
                    {groupMember && (
                      <span className="text-gray-500 ml-2">
                        ({points} points)
                      </span>
                    )}
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>

          {values.groupId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Available Points:</strong> {availablePoints} points
              </p>
            </div>
          )}

          <Form.Item label="Prize Type" required>
            <Radio.Group
              value={values.prizeType}
              onChange={(e) => setValue('prizeType', e.target.value)}
            >
              <Radio.Button value="preset">Preset Prizes</Radio.Button>
              <Radio.Button value="custom">Custom Prize</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {values.prizeType === 'preset' ? (
            <Form.Item
              label="Select Prize"
              validateStatus={errors.presetPrize ? 'error' : ''}
              help={errors.presetPrize}
              required
            >
              <Select
                placeholder="Choose a prize"
                value={values.presetPrize || undefined}
                onChange={(value) => setValue('presetPrize', value)}
              >
                {PRESET_PRIZES.map((prize) => (
                  <Select.Option 
                    key={prize.value} 
                    value={prize.value}
                    disabled={availablePoints < prize.amount}
                  >
                    <div className="flex justify-between items-center">
                      <span>{prize.label}</span>
                      {availablePoints < prize.amount && (
                        <span className="text-red-500 text-xs">Insufficient points</span>
                      )}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          ) : (
            <>
              <Form.Item
                label="Prize Description"
                validateStatus={errors.customDescription ? 'error' : ''}
                help={errors.customDescription}
                required
              >
                <Input
                  placeholder="Enter prize description"
                  value={values.customDescription || ''}
                  onChange={(e) => setValue('customDescription', e.target.value)}
                />
              </Form.Item>

              <Form.Item
                label="Points Required"
                validateStatus={errors.customAmount ? 'error' : ''}
                help={errors.customAmount}
                required
              >
                <Input
                  type="number"
                  placeholder="Enter points amount"
                  value={values.customAmount || ''}
                  onChange={(e) => setValue('customAmount', e.target.value)}
                  min="1"
                />
              </Form.Item>
            </>
          )}
        </Form>

        <div className="text-xs text-gray-500 mt-4">
          <p>• Prize redemptions are processed immediately</p>
          <p>• Points will be deducted from your group balance</p>
          <p>• Contact your group admin to claim your prize</p>
        </div>
      </div>
    </Modal>
  )
}