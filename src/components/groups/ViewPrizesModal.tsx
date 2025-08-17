'use client'

import { useState, useEffect } from 'react'
import { Modal, Table, Button } from 'antd'
import { Group, GroupPrize } from '@/types'

interface ViewPrizesModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUser?: any
  onRedeemPrize?: (prize: GroupPrize) => void
}

export default function ViewPrizesModal({
  isOpen,
  onClose,
  group,
  currentUser,
  onRedeemPrize
}: ViewPrizesModalProps) {
  const [loading, setLoading] = useState(false)
  const [prizes, setPrizes] = useState<GroupPrize[]>([])
  const [userPoints, setUserPoints] = useState(0)

  const loadPrizes = async () => {
    if (!group.id) return
    
    setLoading(true)
    try {
      const { getGroupPrizes } = await import('@/lib/firestore')
      const groupPrizes = await getGroupPrizes(group.id)
      // Only show active prizes to members
      setPrizes(groupPrizes.filter(prize => prize.isActive))
    } catch (error) {
      console.error('Error loading prizes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserPoints = async () => {
    if (!group.id || !currentUser?.id) return
    
    try {
      const { getGroupMembers } = await import('@/lib/groups')
      const members = await getGroupMembers(group.id)
      const userMember = members.find((m: any) => m.userId === currentUser.id)
      
      if (userMember) {
        const points = (userMember.pointsEarned || 0) - (userMember.pointsRedeemed || 0)
        setUserPoints(points)
      }
    } catch (error) {
      console.error('Error loading user points:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadPrizes()
      loadUserPoints()
    }
  }, [isOpen, group.id, currentUser?.id])

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
      title: 'Action',
      key: 'action',
      render: (_: any, record: GroupPrize) => (
        <Button
          type="primary"
          size="small"
          onClick={() => onRedeemPrize?.(record)}
          disabled={userPoints < record.pointsCost}
        >
          {userPoints < record.pointsCost ? 'Insufficient Points' : 'Apply'}
        </Button>
      ),
    },
  ]

  return (
    <Modal
      title={`🏆 Prizes - ${group.name}`}
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
      width={700}
      destroyOnClose
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Your Available Points:</strong> {userPoints} points
          </p>
        </div>

        <Table
          columns={columns}
          dataSource={prizes}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: false,
          }}
          locale={{ 
            emptyText: 'No prizes available in this group yet.' 
          }}
        />

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Click "Apply" to submit a redemption application</p>
          <p>• Applications require admin approval before points are deducted</p>
          <p>• You can only apply for prizes if you have sufficient points</p>
        </div>
      </div>
    </Modal>
  )
}