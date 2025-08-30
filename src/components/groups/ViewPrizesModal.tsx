'use client'

import { useState, useEffect } from 'react'
import { Modal, Table, Button, Tag } from 'antd'
import { Group, GroupPrize, PrizeRedemptionApplication } from '@/types'

interface ViewPrizesModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUser?: any
  onRedeemPrize?: (prize: GroupPrize) => void
  refreshTrigger?: number // Add this to trigger refresh from parent
}

export default function ViewPrizesModal({
  isOpen,
  onClose,
  group,
  currentUser,
  onRedeemPrize,
  refreshTrigger
}: ViewPrizesModalProps) {
  const [loading, setLoading] = useState(false)
  const [prizes, setPrizes] = useState<GroupPrize[]>([])
  const [userPoints, setUserPoints] = useState(0)
  const [pendingApplications, setPendingApplications] = useState<PrizeRedemptionApplication[]>([])

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

  const loadPendingApplications = async () => {
    if (!group.id || !currentUser?.id) return
    
    try {
      const { getGroupPrizeRedemptionApplications } = await import('@/lib/firestore')
      const applications = await getGroupPrizeRedemptionApplications(group.id)
      // Filter to only show current user's pending applications
      const userPendingApps = applications.filter(app => 
        app.userId === currentUser.id && app.status === 'pending'
      )
      setPendingApplications(userPendingApps)
    } catch (error) {
      console.error('Error loading pending applications:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadPrizes()
      loadUserPoints()
      loadPendingApplications()
    }
  }, [isOpen, group.id, currentUser?.id, refreshTrigger])

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
      key: 'status',
      render: (_: any, record: GroupPrize) => {
        const pendingApp = pendingApplications.find(app => app.prizeTitle === record.title)
        
        if (pendingApp) {
          return (
            <Tag color="orange" className="text-xs">
              Application Pending
            </Tag>
          )
        }
        
        if (userPoints < record.pointsCost) {
          return (
            <Tag color="red" className="text-xs">
              Insufficient Points
            </Tag>
          )
        }
        
        return (
          <Tag color="green" className="text-xs">
            Available
          </Tag>
        )
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: GroupPrize) => {
        const pendingApp = pendingApplications.find(app => app.prizeTitle === record.title)
        const hasInsufficientPoints = userPoints < record.pointsCost
        
        let buttonText = 'Apply'
        let isDisabled = false
        
        if (pendingApp) {
          buttonText = 'Pending Approval'
          isDisabled = true
        } else if (hasInsufficientPoints) {
          buttonText = 'Insufficient Points'
          isDisabled = true
        }
        
        return (
          <Button
            type="primary"
            size="small"
            onClick={() => onRedeemPrize?.(record)}
            disabled={isDisabled}
          >
            {buttonText}
          </Button>
        )
      },
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

        {pendingApplications.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-orange-800 mb-2">
              ⏳ Your Pending Applications ({pendingApplications.length})
            </h4>
            <div className="space-y-2">
              {pendingApplications.map((app) => (
                <div key={app.id} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium text-orange-900">{app.prizeTitle}</span>
                    <span className="text-orange-700 ml-2">- {app.pointsCost} points</span>
                  </div>
                  <Tag color="orange" size="small">
                    Awaiting Approval
                  </Tag>
                </div>
              ))}
            </div>
            <p className="text-xs text-orange-600 mt-2">
              Your applications are being reviewed by the group admin. You cannot apply for the same prize while your application is pending.
            </p>
          </div>
        )}

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
          <p>• You cannot apply for a prize while you have a pending application for it</p>
        </div>
      </div>
    </Modal>
  )
}