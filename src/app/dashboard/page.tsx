'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/auth'
import { getUserTransactions, addPointsTransaction, PointsTransaction } from '@/lib/firestore'
import { 
  createGroup, 
  joinGroupByCode, 
  getUserGroups, 
  sendGroupInvitations 
} from '@/lib/groups'
import { createGroupTask, updateGroupTask } from '@/lib/tasks'
import { Group, CreateGroupFormData, GroupInvitation, GroupTask } from '@/types'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants'
import CreateGroupModal from '@/components/groups/CreateGroupModal'
import JoinGroupModal from '@/components/groups/JoinGroupModal'
import GroupCard from '@/components/groups/GroupCard'
import InviteUsersModal from '@/components/groups/InviteUsersModal'
import ManageInvitationsModal from '@/components/groups/ManageInvitationsModal'
import ViewMembersModal from '@/components/groups/ViewMembersModal'
import ProfileSettingsModal from '@/components/ui/ProfileSettingsModal'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import ManageTasksModal from '@/components/tasks/ManageTasksModal'
import { Button, Alert } from '@/components/ui'

export default function Dashboard() {
  const { user, userProfile, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  
  // Group-related state
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showManageInvitationsModal, setShowManageInvitationsModal] = useState(false)
  const [showViewMembersModal, setShowViewMembersModal] = useState(false)
  const [showProfileSettingsModal, setShowProfileSettingsModal] = useState(false)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showManageTasksModal, setShowManageTasksModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [editingTask, setEditingTask] = useState<GroupTask | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadTransactions()
      loadGroups()
    }
  }, [user])

  const loadTransactions = async () => {
    if (!user) return
    
    setLoadingTransactions(true)
    try {
      const userTransactions = await getUserTransactions(user.uid, 5)
      setTransactions(userTransactions)
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  const loadGroups = async () => {
    if (!user) return
    
    setLoadingGroups(true)
    try {
      const userGroups = await getUserGroups(user.uid)
      setGroups(userGroups)
    } catch (error) {
      console.error('Error loading groups:', error)
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleCreateGroup = async (groupData: CreateGroupFormData) => {
    if (!user || !userProfile) return

    try {
      await createGroup(user.uid, userProfile.name, groupData)
      setSuccessMessage(SUCCESS_MESSAGES.GROUP.CREATED)
      await loadGroups()
      clearMessages()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : ERROR_MESSAGES.GROUP.CREATE_FAILED)
      clearMessages()
    }
  }

  const handleJoinGroup = async (groupCode: string) => {
    if (!user || !userProfile) return

    try {
      await joinGroupByCode(user.uid, userProfile.name, userProfile.email, groupCode)
      setSuccessMessage(SUCCESS_MESSAGES.GROUP.JOINED)
      await loadGroups()
      clearMessages()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : ERROR_MESSAGES.GROUP.JOIN_FAILED)
      clearMessages()
    }
  }

  const handleInviteUsers = async (emails: string[]): Promise<GroupInvitation[]> => {
    if (!selectedGroup || !user || !userProfile) {
      throw new Error('Missing required data')
    }

    try {
      const invitations = await sendGroupInvitations(
        {
          groupId: selectedGroup.id,
          emails,
          adminId: user.uid,
        },
        userProfile.name,
        selectedGroup.name
      )
      
      setSuccessMessage(SUCCESS_MESSAGES.GROUP.INVITATION_SENT)
      clearMessages()
      return invitations
    } catch (error) {
      throw error
    }
  }

  const clearMessages = () => {
    setTimeout(() => {
      setSuccessMessage(null)
      setErrorMessage(null)
    }, 5000)
  }

  const openInviteModal = (group: Group) => {
    setSelectedGroup(group)
    setShowInviteModal(true)
  }

  const openManageInvitationsModal = (group: Group) => {
    setSelectedGroup(group)
    setShowManageInvitationsModal(true)
  }

  const openViewMembersModal = (group: Group) => {
    setSelectedGroup(group)
    setShowViewMembersModal(true)
  }

  const openCreateTaskModal = (group: Group) => {
    setSelectedGroup(group)
    setEditingTask(null)
    setShowCreateTaskModal(true)
  }

  const openManageTasksModal = (group: Group) => {
    setSelectedGroup(group)
    setShowManageTasksModal(true)
  }

  const handleEditTask = (task: GroupTask) => {
    setEditingTask(task)
    setShowManageTasksModal(false)
    setShowCreateTaskModal(true)
  }

  const handleCreateTask = async (taskData: { title: string; description: string; points: number }) => {
    if (!selectedGroup || !user || !userProfile) return

    try {
      await createGroupTask(selectedGroup.id, user.uid, userProfile.name, taskData)
      setSuccessMessage(SUCCESS_MESSAGES.TASK.CREATED)
      clearMessages()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : ERROR_MESSAGES.TASK.CREATE_FAILED)
      clearMessages()
    }
  }

  const handleUpdateTask = async (taskId: string, taskData: { title: string; description: string; points: number }) => {
    try {
      await updateGroupTask(taskId, taskData)
      setSuccessMessage(SUCCESS_MESSAGES.TASK.UPDATED)
      setEditingTask(null)
      clearMessages()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : ERROR_MESSAGES.TASK.UPDATE_FAILED)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Happy Points</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {userProfile.name || user.email}</span>
              <button
                onClick={() => setShowProfileSettingsModal(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition duration-200"
                title="Profile Settings"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userProfile.name || 'User'}!
          </h2>
          <p className="text-gray-600">Here's an overview of your points activity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Current Points
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {userProfile.currentPoints.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">↑</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Earned
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {userProfile.totalEarned.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">↓</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Redeemed
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {userProfile.totalRedeemed.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {(successMessage || errorMessage) && (
          <div className="mb-6">
            {successMessage && (
              <Alert variant="success">
                {successMessage}
              </Alert>
            )}
            {errorMessage && (
              <Alert variant="error">
                {errorMessage}
              </Alert>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Groups Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">My Groups</h3>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowJoinGroupModal(true)}
                >
                  Join Group
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowCreateGroupModal(true)}
                >
                  Create Group
                </Button>
              </div>
            </div>
            
            {loadingGroups ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : groups.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {groups.map((group) => (
                  <div key={group.id} className="relative">
                    <GroupCard
                      group={group}
                      isAdmin={group.adminId === user?.uid}
                    />
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          openViewMembersModal(group)
                        }}
                        title="View Members"
                      >
                        👥
                      </Button>
                      {group.adminId === user?.uid && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              openCreateTaskModal(group)
                            }}
                            title="Create Task"
                          >
                            📝
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              openManageTasksModal(group)
                            }}
                            title="Manage Tasks"
                          >
                            📋
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              openManageInvitationsModal(group)
                            }}
                            title="Manage Invitations"
                          >
                            📧
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              openInviteModal(group)
                            }}
                          >
                            Invite
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-4">You're not a member of any groups yet</p>
                <div className="space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowJoinGroupModal(true)}
                  >
                    Join a Group
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateGroupModal(true)}
                  >
                    Create Your First Group
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition duration-200">
                <div className="font-medium text-green-800">Earn Points</div>
                <div className="text-sm text-green-600">Complete activities to earn more points</div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition duration-200">
                <div className="font-medium text-blue-800">Redeem Rewards</div>
                <div className="text-sm text-blue-600">Browse available rewards and redeem points</div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition duration-200">
                <div className="font-medium text-purple-800">View History</div>
                <div className="text-sm text-purple-600">See your complete points history</div>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            {loadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-200">
                    <div>
                      <div className="font-medium text-gray-900">{transaction.description}</div>
                      <div className="text-sm text-gray-500">
                        {transaction.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                      </div>
                    </div>
                    <div className={`font-medium ${
                      transaction.type === 'earn' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'earn' ? '+' : '-'}{transaction.amount}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent activity. Start earning points!
              </div>
            )}
          </div>
        </div>
      </main>

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
        <InviteUsersModal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false)
            setSelectedGroup(null)
          }}
          onInviteUsers={handleInviteUsers}
          groupName={selectedGroup.name}
        />
      )}

      {selectedGroup && userProfile && (
        <ManageInvitationsModal
          isOpen={showManageInvitationsModal}
          onClose={() => {
            setShowManageInvitationsModal(false)
            setSelectedGroup(null)
          }}
          group={selectedGroup}
          adminName={userProfile.name}
        />
      )}

      {selectedGroup && user && (
        <ViewMembersModal
          isOpen={showViewMembersModal}
          onClose={() => {
            setShowViewMembersModal(false)
            setSelectedGroup(null)
          }}
          group={selectedGroup}
          currentUserId={user.uid}
          isAdmin={selectedGroup.adminId === user.uid}
        />
      )}

      <ProfileSettingsModal
        isOpen={showProfileSettingsModal}
        onClose={() => setShowProfileSettingsModal(false)}
      />

      {selectedGroup && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => {
            setShowCreateTaskModal(false)
            setSelectedGroup(null)
            setEditingTask(null)
          }}
          onCreateTask={handleCreateTask}
          editingTask={editingTask}
          onUpdateTask={handleUpdateTask}
        />
      )}

      {selectedGroup && user && (
        <ManageTasksModal
          isOpen={showManageTasksModal}
          onClose={() => {
            setShowManageTasksModal(false)
            setSelectedGroup(null)
          }}
          group={selectedGroup}
          currentUserId={user.uid}
          onEditTask={handleEditTask}
        />
      )}
    </div>
  )
}