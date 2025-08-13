'use client'

import React, { useState } from 'react'
import { Modal, Button, Tabs } from 'antd'
import { Group, UserProfile } from '@/types'
import InviteUsersModal from './InviteUsersModal'
import ManageInvitationsModal from './ManageInvitationsModal'
import ViewMembersModal from './ViewMembersModal'

interface MemberManagementModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUser: UserProfile | null
  onInviteUsers: (emails: string[]) => Promise<any>
  onMemberClick?: (member: any) => void
}

const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  onInviteUsers,
  onMemberClick
}) => {
  const [activeTab, setActiveTab] = useState('view-members')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showManageInvitationsModal, setShowManageInvitationsModal] = useState(false)
  const [showViewMembersModal, setShowViewMembersModal] = useState(false)

  const isAdmin = currentUser?.id === group.adminId

  const handleTabAction = (action: string) => {
    switch (action) {
      case 'invite':
        setShowInviteModal(true)
        break
      case 'manage-invitations':
        setShowManageInvitationsModal(true)
        break
      case 'view-members':
        setShowViewMembersModal(true)
        break
    }
  }

  const closeSubModals = () => {
    setShowInviteModal(false)
    setShowManageInvitationsModal(false)
    setShowViewMembersModal(false)
  }

  const tabItems = [
    {
      key: 'view-members',
      label: '👥 View All Members',
      children: (
        <div className="space-y-4">
          <Button type="primary" onClick={() => handleTabAction('view-members')}>
            👥 View Member List
          </Button>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Group Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Current Members:</span>
                <span className="font-medium ml-2">{group.memberCount}</span>
              </div>
              <div>
                <span className="text-gray-500">Max Members:</span>
                <span className="font-medium ml-2">{group.maxMembers}</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <p>View member details, points, and manage member status (admin only).</p>
            </div>
          </div>
        </div>
      )
    }
  ]

  if (isAdmin) {
    tabItems.push(
      {
        key: 'invite-members',
        label: '📧 Invite New Members',
        children: (
          <div className="space-y-4">
            <Button type="primary" onClick={() => handleTabAction('invite')}>
              📧 Send Invitations
            </Button>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Invite New Members</h4>
              <p className="text-sm text-green-800">
                Send email invitations to new members. They'll receive a link to join your group.
              </p>
              <div className="mt-2 text-sm text-green-700">
                <p>• Invitations expire after 7 days</p>
                <p>• Members must have an account to accept invitations</p>
              </div>
            </div>
          </div>
        )
      },
      {
        key: 'manage-invitations',
        label: '📋 Manage Invitations',
        children: (
          <div className="space-y-4">
            <Button type="primary" onClick={() => handleTabAction('manage-invitations')}>
              📋 View All Invitations
            </Button>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Invitation Management</h4>
              <p className="text-sm text-blue-800">
                Track the status of sent invitations, resend expired ones, or cancel pending invitations.
              </p>
              <div className="mt-2 text-sm text-blue-700">
                <p>• View pending, accepted, and expired invitations</p>
                <p>• Resend or cancel invitations as needed</p>
              </div>
            </div>
          </div>
        )
      }
    )
  }

  return (
    <>
      <Modal
        title={`Member Management - ${group.name}`}
        open={isOpen}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        ]}
        width={600}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Modal>

      {/* Sub-modals */}
      <InviteUsersModal
        isOpen={showInviteModal}
        onClose={closeSubModals}
        onInviteUsers={onInviteUsers}
        groupName={group.name}
        currentUserEmail={currentUser?.email}
      />
      
      <ManageInvitationsModal
        isOpen={showManageInvitationsModal}
        onClose={closeSubModals}
        group={group}
        adminName={currentUser?.name || ''}
      />
      
      <ViewMembersModal
        isOpen={showViewMembersModal}
        onClose={closeSubModals}
        group={group}
        currentUserId={currentUser?.id || ''}
        isAdmin={isAdmin}
        onMemberClick={onMemberClick}
      />
    </>
  )
}

export default MemberManagementModal