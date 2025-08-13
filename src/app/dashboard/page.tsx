'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'

// React Query hooks
import { useUserTransactions } from '@/hooks/queries/useTransactions'
import { useUserGroups, useCreateGroup, useInviteUsers, useAwardPoints } from '@/hooks/queries/useGroups'
import { useUserNotifications } from '@/hooks/queries/useNotifications'
import { useUserPendingItems } from '@/hooks/queries/usePendingItems'

import { Group, CreateGroupFormData } from '@/types'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import CreateGroupModal from '@/components/groups/CreateGroupModal'
import GroupCard from '@/components/groups/GroupCard'
import MemberManagementModal from '@/components/groups/MemberManagementModal'
import TaskManagementModal from '@/components/groups/TaskManagementModal'
import PendingActionsPanel from '@/components/groups/PendingActionsPanel'
import ProfileSettingsModal from '@/components/ui/ProfileSettingsModal'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import ManageTasksModal from '@/components/tasks/ManageTasksModal'
import TaskApplicationModal from '@/components/tasks/TaskApplicationModal'
import TaskApplicationsModal from '@/components/tasks/TaskApplicationsModal'
import ViewTasksModal from '@/components/tasks/ViewTasksModal'
import AwardPointsModal from '@/components/groups/AwardPointsModal'
import QuickGrantPointsModal from '@/components/groups/QuickGrantPointsModal'
import ReviewJoinRequestsModal from '@/components/groups/ReviewJoinRequestsModal'
import { Button, Alert } from 'antd'

export default function Dashboard() {
  const { user, userProfile, loading, refreshProfile } = useAuth()
  const router = useRouter()

  // React Query hooks for data fetching
  const { data: transactions = [], isLoading: loadingTransactions } = useUserTransactions(user?.uid, 5)
  const { data: groups = [], isLoading: loadingGroups } = useUserGroups(user?.uid)
  const { data: notifications = [], isLoading: loadingNotifications } = useUserNotifications(user?.uid, 5)
  const { data: pendingItems = [] } = useUserPendingItems(user?.uid, groups)

  // Mutations
  const createGroupMutation = useCreateGroup()
  const inviteUsersMutation = useInviteUsers()
  const awardPointsMutation = useAwardPoints()

  // UI state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [showMemberManagementModal, setShowMemberManagementModal] = useState(false)
  const [showTaskManagementModal, setShowTaskManagementModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showTaskApplicationModal, setShowTaskApplicationModal] = useState(false)
  const [showAwardPointsModal, setShowAwardPointsModal] = useState(false)
  const [showReviewJoinRequestsModal, setShowReviewJoinRequestsModal] = useState(false)
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [showQuickGrantPointsModal, setShowQuickGrantPointsModal] = useState(false)
  
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0)

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
      case 'member-management':
        setShowMemberManagementModal(true)
        break
      case 'task-management':
        setShowTaskManagementModal(true)
        break
      case 'award-points':
        setShowAwardPointsModal(true)
        break
      case 'review-requests':
        setShowReviewJoinRequestsModal(true)
        break
    }
  }

  const handleMemberClick = (member: any) => {
    setSelectedMember(member)
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
    if (!selectedGroup || !userProfile || !user) {
      throw new Error('Group or user data not available')
    }
    
    try {
      const { createGroupTask } = await import('@/lib/tasks')
      await createGroupTask(
        selectedGroup.id,
        user.uid,
        userProfile.name,
        taskData
      )
      setSuccessMessage('Task created successfully!')
      setTaskRefreshTrigger(prev => prev + 1)
      clearMessages()
    } catch (error) {
      console.error('Error creating task:', error)
      setErrorMessage('Failed to create task. Please try again.')
      clearMessages()
      throw error
    }
  }

  const handleEditTask = (task: any) => {
    setSelectedTask(task)
    setShowEditTaskModal(true)
  }

  const handleUpdateTask = async (taskId: string, taskData: { title: string; description: string; points: number }) => {
    try {
      const { updateGroupTask } = await import('@/lib/tasks')
      await updateGroupTask(taskId, taskData)
      setSuccessMessage('Task updated successfully!')
      setTaskRefreshTrigger(prev => prev + 1)
      clearMessages()
    } catch (error) {
      console.error('Error updating task:', error)
      setErrorMessage('Failed to update task. Please try again.')
      clearMessages()
      throw error
    }
  }

  const handleApplicationProcessed = () => {
    // Refresh data when task applications are processed
    console.log('Task application processed')
    // Refresh user profile to show updated points
    refreshProfile()
  }

  const handleApplicationSubmitted = () => {
    // Handle when user submits a task application
    console.log('Task application submitted')
    setSuccessMessage('Task application submitted successfully!')
    clearMessages()
  }

  const handleTaskClaimed = () => {
    // Handle when user claims a task
    console.log('Task claimed')
    // Refresh user profile to update points if needed
  }

  const closeModals = () => {
    setShowMemberManagementModal(false)
    setShowTaskManagementModal(false)
    setShowEditTaskModal(false)
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

  // Separate groups by user's role
  const adminGroups = groups.filter(group => group.adminId === user?.uid)
  const memberGroups = groups.filter(group => group.adminId !== user?.uid)
  const isAdminOfAnyGroup = adminGroups.length > 0
  const isMemberOfAnyGroup = memberGroups.length > 0

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
                    {groups.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p>Join or create a group to get started!</p>
                      </div>
                    ) : (
                      <>
                        {/* Grant Points button - only for groups where user is admin */}
                        {isAdminOfAnyGroup && (
                          <Button 
                            onClick={() => setShowQuickGrantPointsModal(true)}
                            className="w-full relative"
                            type="primary"
                          >
                            🎁 Grant Points
                            {pendingItems.some(item => item.type === 'admin') && (
                              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                            )}
                          </Button>
                        )}
                        
                        {/* Claim Points button - only for groups where user is member but not admin */}
                        {isMemberOfAnyGroup && (
                          <Button 
                            onClick={() => setShowTaskApplicationModal(true)}
                            className="w-full relative"
                            type={isAdminOfAnyGroup ? "default" : "primary"}
                          >
                            🏆 Claim Points
                            {pendingItems.some(item => item.type === 'user') && (
                              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                            )}
                          </Button>
                        )}
                        
                        {/* Show helpful info about what each button does */}
                        <div className="text-xs text-gray-500 space-y-1">
                          {isAdminOfAnyGroup && (
                            <p>• Grant Points: Award points to members in groups you admin ({adminGroups.length} group{adminGroups.length !== 1 ? 's' : ''})</p>
                          )}
                          {isMemberOfAnyGroup && (
                            <p>• Claim Points: Apply for tasks in groups where you're a member ({memberGroups.length} group{memberGroups.length !== 1 ? 's' : ''})</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2">
              {/* Pending Actions Panel */}
              <PendingActionsPanel
                currentUser={userProfile}
                groups={groups}
                onReviewRequests={(group) => openGroupModal(group, 'review-requests')}
                onViewApplications={(group) => openGroupModal(group, 'task-management')}
              />

              {/* Groups Section */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Your Groups</h2>
                  <Button 
                    onClick={() => setShowCreateGroupModal(true)}
                    type="primary"
                    className="flex items-center"
                  >
                    <span className="text-white mr-1">+</span> Create Group
                  </Button>
                </div>
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
                        onMemberManagement={() => openGroupModal(group, 'member-management')}
                        onTaskManagement={() => openGroupModal(group, 'task-management')}
                        onAwardPoints={() => openGroupModal(group, 'award-points')}
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

      {selectedGroup && (
        <>
          <MemberManagementModal
            isOpen={showMemberManagementModal}
            onClose={closeModals}
            group={selectedGroup}
            currentUser={userProfile}
            onInviteUsers={handleInviteUsers}
            onMemberClick={handleMemberClick}
          />
          
          <TaskManagementModal
            isOpen={showTaskManagementModal}
            onClose={closeModals}
            group={selectedGroup}
            currentUser={userProfile}
            onCreateTask={handleCreateTask}
            onEditTask={handleEditTask}
            onUpdateTask={handleUpdateTask}
            onApplicationProcessed={handleApplicationProcessed}
            onTaskClaimed={handleTaskClaimed}
            refreshTrigger={taskRefreshTrigger}
          />
          
          <CreateTaskModal
            isOpen={showEditTaskModal}
            onClose={closeModals}
            onCreateTask={handleCreateTask}
            editingTask={selectedTask}
            onUpdateTask={handleUpdateTask}
          />
          
          <AwardPointsModal
            isOpen={showAwardPointsModal}
            onClose={closeModals}
            groupId={selectedGroup?.id}
            member={selectedMember}
            onAwardPoints={async (memberId: string, taskId: string, points: number) => {
              if (!userProfile?.id || !selectedGroup?.id) {
                throw new Error('Missing required data for awarding points')
              }
              
              await awardPointsMutation.mutateAsync({
                groupId: selectedGroup.id,
                memberId,
                adminId: userProfile.id,
                adminName: userProfile.name,
                points,
                taskId: taskId || undefined,
                taskTitle: undefined // Task title will be retrieved in the backend if taskId is provided
              })
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
        memberGroupsOnly={true}
      />

      <QuickGrantPointsModal
        isOpen={showQuickGrantPointsModal}
        onClose={() => setShowQuickGrantPointsModal(false)}
        adminGroups={adminGroups}
        currentUserId={user?.uid || ''}
        onAwardPoints={async (memberId: string, taskId: string, points: number, groupId?: string) => {
          if (!userProfile?.id) {
            throw new Error('User profile not available')
          }
          
          if (!groupId) {
            throw new Error('Group ID is required')
          }
          
          await awardPointsMutation.mutateAsync({
            groupId,
            memberId,
            adminId: userProfile.id,
            adminName: userProfile.name,
            points,
            taskId: taskId !== 'custom' ? taskId : undefined,
            taskTitle: undefined
          })
        }}
      />

      <ProfileSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  )
}