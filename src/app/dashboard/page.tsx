'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'

// React Query hooks
import { useUserTransactions } from '@/hooks/queries/useTransactions'
import { useUserGroups, useCreateGroup, useJoinGroup, useInviteUsers } from '@/hooks/queries/useGroups'
import { useUserNotifications } from '@/hooks/queries/useNotifications'

import { Group, CreateGroupFormData } from '@/types'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import CreateGroupModal from '@/components/groups/CreateGroupModal'
import JoinGroupModal from '@/components/groups/JoinGroupModal'
import GroupCard from '@/components/groups/GroupCard'
import InviteUsersModal from '@/components/groups/InviteUsersModal'
import ManageInvitationsModal from '@/components/groups/ManageInvitationsModal'
import ViewMembersModal from '@/components/groups/ViewMembersModal'
import ProfileSettingsModal from '@/components/ui/ProfileSettingsModal'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import ManageTasksModal from '@/components/tasks/ManageTasksModal'
import TaskApplicationModal from '@/components/tasks/TaskApplicationModal'
import TaskApplicationsModal from '@/components/tasks/TaskApplicationsModal'
import AwardPointsModal from '@/components/groups/AwardPointsModal'
import ReviewJoinRequestsModal from '@/components/groups/ReviewJoinRequestsModal'
import { Button, Alert } from 'antd'

export default function Dashboard() {
  const { user, userProfile, loading, refreshProfile } = useAuth()
  const router = useRouter()

  // React Query hooks for data fetching
  const { data: transactions = [], isLoading: loadingTransactions } = useUserTransactions(user?.uid, 5)
  const { data: groups = [], isLoading: loadingGroups } = useUserGroups(user?.uid)
  const { data: notifications = [], isLoading: loadingNotifications } = useUserNotifications(user?.uid, 5)

  // Mutations
  const createGroupMutation = useCreateGroup()
  const joinGroupMutation = useJoinGroup()
  const inviteUsersMutation = useInviteUsers()

  // UI state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showManageInvitationsModal, setShowManageInvitationsModal] = useState(false)
  const [showViewMembersModal, setShowViewMembersModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showManageTasksModal, setShowManageTasksModal] = useState(false)
  const [showTaskApplicationModal, setShowTaskApplicationModal] = useState(false)
  const [showTaskApplicationsModal, setShowTaskApplicationsModal] = useState(false)
  const [showAwardPointsModal, setShowAwardPointsModal] = useState(false)
  const [showReviewJoinRequestsModal, setShowReviewJoinRequestsModal] = useState(false)
  
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedMember, setSelectedMember] = useState<any>(null)

  // Messages
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const clearMessages = () => {
    setTimeout(() => {
      setSuccessMessage('')
      setErrorMessage('')
    }, 5000)
  }

  const handleCreateGroup = async (groupData: CreateGroupFormData) => {
    if (!user || !userProfile) return

    try {
      await createGroupMutation.mutateAsync({ 
        userId: user.uid, 
        userProfile,
        groupData: groupData
      })
      setSuccessMessage(SUCCESS_MESSAGES.GROUP.CREATED)
      setShowCreateGroupModal(false)
      clearMessages()
    } catch (error) {
      setErrorMessage(ERROR_MESSAGES.GROUP.CREATE_FAILED)
      clearMessages()
    }
  }

  const handleJoinGroup = async (groupCode: string) => {
    if (!user || !userProfile) return

    try {
      await joinGroupMutation.mutateAsync({ userId: user.uid, userProfile, groupCode })
      setSuccessMessage('Join request submitted! The group admin will review your request.')
      setShowJoinGroupModal(false)
      clearMessages()
    } catch (error) {
      setErrorMessage('Failed to submit join request. Please check the group code and try again.')
      clearMessages()
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const openGroupModal = (group: Group, modalType: string) => {
    setSelectedGroup(group)
    switch (modalType) {
      case 'invite':
        setShowInviteModal(true)
        break
      case 'manage-invitations':
        setShowManageInvitationsModal(true)
        break
      case 'view-members':
        setShowViewMembersModal(true)
        break
      case 'create-task':
        setShowCreateTaskModal(true)
        break
      case 'manage-tasks':
        setShowManageTasksModal(true)
        break
      case 'task-applications':
        setShowTaskApplicationsModal(true)
        break
      case 'review-requests':
        setShowReviewJoinRequestsModal(true)
        break
    }
  }

  const handleMemberClick = (member: any) => {
    setSelectedMember(member)
    setShowViewMembersModal(false)
    setShowAwardPointsModal(true)
  }

  const handleRequestProcessed = () => {
    // Refresh any data that needs to be updated when requests are processed
    console.log('Join request processed')
  }

  const handleInviteUsers = async (emails: string[]) => {
    if (!selectedGroup || !userProfile || !user) {
      throw new Error('Group or user data not available')
    }
    
    try {
      const result = await inviteUsersMutation.mutateAsync({
        groupId: selectedGroup.id,
        emails,
        adminId: user.uid,
        adminName: userProfile.name,
        groupName: selectedGroup.name
      })
      return result
    } catch (error) {
      console.error('Error inviting users:', error)
      throw error
    }
  }

  const handleCreateTask = async (taskData: { title: string; description: string; points: number }) => {
    if (!selectedGroup || !userProfile) {
      throw new Error('Group or user data not available')
    }
    
    try {
      // TODO: Implement actual create task API call
      console.log('Creating task for group:', selectedGroup.id, taskData)
      setSuccessMessage('Task created successfully!')
      clearMessages()
    } catch (error) {
      console.error('Error creating task:', error)
      setErrorMessage('Failed to create task. Please try again.')
      clearMessages()
      throw error
    }
  }

  const handleEditTask = (task: any) => {
    // TODO: Implement edit task functionality
    console.log('Editing task:', task)
    setSelectedTask(task)
    // You could open an edit task modal here
  }

  const handleApplicationProcessed = () => {
    // Refresh data when task applications are processed
    console.log('Task application processed')
  }

  const handleApplicationSubmitted = () => {
    // Handle when user submits a task application
    console.log('Task application submitted')
    setSuccessMessage('Task application submitted successfully!')
    clearMessages()
  }

  const closeModals = () => {
    setShowInviteModal(false)
    setShowManageInvitationsModal(false)
    setShowViewMembersModal(false)
    setShowCreateTaskModal(false)
    setShowManageTasksModal(false)
    setShowTaskApplicationsModal(false)
    setShowAwardPointsModal(false)
    setShowReviewJoinRequestsModal(false)
    setSelectedGroup(null)
    setSelectedTask(null)
    setSelectedMember(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!user) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Happy Points</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setShowProfileModal(true)}>
                Profile Settings
              </Button>
              <Button onClick={handleSignOut} type="primary" danger>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Messages */}
        {successMessage && (
          <Alert
            message={successMessage}
            type="success"
            showIcon
            closable
            className="mb-4"
          />
        )}
        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            closable
            className="mb-4"
          />
        )}

        {/* Main Content */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {userProfile?.name || 'User'}
                      </h3>
                      <p className="text-sm text-gray-500">{userProfile?.email}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {userProfile?.currentPoints || 0}
                      </p>
                      <p className="text-sm text-gray-500">Current Points</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {userProfile?.totalEarned || 0}
                      </p>
                      <p className="text-sm text-gray-500">Total Earned</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">
                        {userProfile?.totalRedeemed || 0}
                      </p>
                      <p className="text-sm text-gray-500">Total Redeemed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => setShowCreateGroupModal(true)}
                      className="w-full"
                      type="primary"
                    >
                      Create Group
                    </Button>
                    <Button 
                      onClick={() => setShowJoinGroupModal(true)}
                      className="w-full"
                    >
                      Join Group
                    </Button>
                    <Button 
                      onClick={() => setShowTaskApplicationModal(true)}
                      className="w-full"
                    >
                      Apply for Task
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2">
              {/* Groups Section */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Groups</h2>
                {loadingGroups ? (
                  <div className="text-center py-4">Loading groups...</div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>You're not part of any groups yet.</p>
                    <p>Create or join a group to get started!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        currentUser={userProfile}
                        onInviteUsers={() => openGroupModal(group, 'invite')}
                        onManageInvitations={() => openGroupModal(group, 'manage-invitations')}
                        onViewMembers={() => openGroupModal(group, 'view-members')}
                        onCreateTask={() => openGroupModal(group, 'create-task')}
                        onManageTasks={() => openGroupModal(group, 'manage-tasks')}
                        onViewApplications={() => openGroupModal(group, 'task-applications')}
                        onReviewRequests={() => openGroupModal(group, 'review-requests')}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Transactions */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transactions</h2>
                {loadingTransactions ? (
                  <div className="text-center py-4">Loading transactions...</div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No transactions yet.</p>
                  </div>
                ) : (
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                      {transactions.map((transaction, index) => (
                        <li key={index} className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {transaction.description}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatDate(transaction.createdAt)}
                              </p>
                            </div>
                            <div className={`text-sm font-medium ${
                              transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount} points
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recent Notifications */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Notifications</h2>
                {loadingNotifications ? (
                  <div className="text-center py-4">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No notifications yet.</p>
                  </div>
                ) : (
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                      {notifications.map((notification, index) => (
                        <li key={index} className="px-6 py-4">
                          <div>
                            <p className="text-sm text-gray-900">
                              {notification.message}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreateGroup={handleCreateGroup}
      />

      <JoinGroupModal
        isOpen={showJoinGroupModal}
        onClose={() => setShowJoinGroupModal(false)}
        onJoinGroup={handleJoinGroup}
      />

      {selectedGroup && (
        <>
          <InviteUsersModal
            isOpen={showInviteModal}
            onClose={closeModals}
            onInviteUsers={handleInviteUsers}
            groupName={selectedGroup?.name || ''}
          />
          
          <ManageInvitationsModal
            isOpen={showManageInvitationsModal}
            onClose={closeModals}
            group={selectedGroup}
            adminName={userProfile?.name || ''}
          />
          
          <ViewMembersModal
            isOpen={showViewMembersModal}
            onClose={closeModals}
            group={selectedGroup}
            currentUserId={user?.uid}
            isAdmin={selectedGroup?.adminId === userProfile?.id}
            onMemberClick={handleMemberClick}
          />
          
          <CreateTaskModal
            isOpen={showCreateTaskModal}
            onClose={closeModals}
            onCreateTask={handleCreateTask}
          />
          
          <ManageTasksModal
            isOpen={showManageTasksModal}
            onClose={closeModals}
            group={selectedGroup}
            currentUserId={userProfile?.id || ''}
            onEditTask={handleEditTask}
          />
          
          <TaskApplicationsModal
            isOpen={showTaskApplicationsModal}
            onClose={closeModals}
            group={selectedGroup}
            adminId={userProfile?.id || ''}
            adminName={userProfile?.name || ''}
            onApplicationProcessed={handleApplicationProcessed}
          />
          
          <AwardPointsModal
            isOpen={showAwardPointsModal}
            onClose={closeModals}
            groupId={selectedGroup?.id}
            member={selectedMember}
            onAwardPoints={async (memberId: string, taskId: string, points: number) => {
              // TODO: Implement award points logic
              console.log('Award points:', { memberId, taskId, points })
            }}
          />
          
          {userProfile?.id && (
            <ReviewJoinRequestsModal
              isOpen={showReviewJoinRequestsModal}
              onClose={closeModals}
              adminId={userProfile.id}
              adminName={userProfile.name}
              onRequestProcessed={handleRequestProcessed}
            />
          )}
        </>
      )}

      <TaskApplicationModal
        isOpen={showTaskApplicationModal}
        onClose={() => setShowTaskApplicationModal(false)}
        userId={userProfile?.id || ''}
        userName={userProfile?.name || ''}
        onApplicationSubmitted={handleApplicationSubmitted}
      />

      <ProfileSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  )
}