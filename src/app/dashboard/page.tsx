'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/auth'
import { getUserTransactions, addPointsTransaction } from '@/lib/firestore'
import { 
  createGroup, 
  joinGroupByCode, 
  getUserGroups, 
  sendGroupInvitations,
  getPendingGroupInvitations,
  getPendingJoinRequests,
  getAdminGroupStats
} from '@/lib/groups'
import { createGroupTask, updateGroupTask, awardPointsToMember, getTask, getPendingTaskApplications, getAdminTaskStats } from '@/lib/tasks'
import { Group, CreateGroupFormData, GroupInvitation, GroupTask, GroupMember, PointsTransaction } from '@/types'
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
import TaskApplicationModal from '@/components/tasks/TaskApplicationModal'
import TaskApplicationsModal from '@/components/tasks/TaskApplicationsModal'
import AwardPointsModal from '@/components/groups/AwardPointsModal'
import ReviewJoinRequestsModal from '@/components/groups/ReviewJoinRequestsModal'
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
  const [showAwardPointsModal, setShowAwardPointsModal] = useState(false)
  const [showTaskApplicationModal, setShowTaskApplicationModal] = useState(false)
  const [showTaskApplicationsModal, setShowTaskApplicationsModal] = useState(false)
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null)
  const [editingTask, setEditingTask] = useState<GroupTask | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Admin-specific state
  const [adminTaskStats, setAdminTaskStats] = useState<any>(null)
  const [adminGroupStats, setAdminGroupStats] = useState<any>(null)
  const [pendingApplications, setPendingApplications] = useState<any[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
  const [pendingJoinRequests, setPendingJoinRequests] = useState<any[]>([])
  const [loadingAdminData, setLoadingAdminData] = useState(false)

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

  useEffect(() => {
    if (user && groups.length > 0) {
      const isAdmin = groups.some(group => group.adminId === user.uid)
      if (isAdmin) {
        loadAdminData()
      }
    }
  }, [user, groups])

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

  const loadAdminData = async () => {
    if (!user) return
    
    setLoadingAdminData(true)
    try {
      const [taskStats, groupStats, applications, invitations, joinRequests] = await Promise.all([
        getAdminTaskStats(user.uid),
        getAdminGroupStats(user.uid),
        getPendingTaskApplications(user.uid),
        getPendingGroupInvitations(user.uid),
        getPendingJoinRequests(user.uid)
      ])
      
      setAdminTaskStats(taskStats)
      setAdminGroupStats(groupStats)
      setPendingApplications(applications)
      setPendingInvitations(invitations)
      setPendingJoinRequests(joinRequests)
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoadingAdminData(false)
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
      setSuccessMessage('Join request submitted! The group admin will review your request.')
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

  const handleMemberClick = (member: GroupMember) => {
    setSelectedMember(member)
    setShowAwardPointsModal(true)
  }

  const handleAwardPoints = async (memberId: string, taskId: string, points: number) => {
    if (!selectedGroup || !user || !userProfile || !selectedMember) return

    try {
      let taskTitle = ''
      if (taskId) {
        const task = await getTask(taskId)
        taskTitle = task?.title || ''
      }

      await awardPointsToMember(
        selectedGroup.id,
        memberId,
        user.uid,
        userProfile.name,
        points,
        taskId || undefined,
        taskTitle || undefined
      )
      
      setSuccessMessage(`Successfully awarded ${points} points to ${selectedMember.userName}`)
      await refreshProfile() // Refresh to update the current user's view if needed
      clearMessages()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to award points')
      clearMessages()
    }
  }

  const handleApplicationSubmitted = () => {
    setSuccessMessage('Task application submitted successfully!')
    clearMessages()
  }

  const handleApplicationProcessed = async () => {
    await refreshProfile() // Refresh to update points if needed
    await loadTransactions() // Refresh transactions to show new activity
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
              <div className="space-y-6 max-h-80 overflow-y-auto">
                {/* Admin-Managed Groups */}
                {(() => {
                  const adminGroups = groups.filter(group => group.adminId === user?.uid)
                  return adminGroups.length > 0 ? (
                    <div>
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <h4 className="text-sm font-medium text-gray-800">Admin Groups</h4>
                        <span className="ml-2 text-xs text-gray-500">({adminGroups.length})</span>
                      </div>
                      <div className="space-y-3">
{adminGroups.map((group) => (
                          <div key={group.id} className="relative border-l-4 border-blue-200 pl-3">
                            <GroupCard
                              group={group}
                              isAdmin={true}
                            />
                            
                            {/* Admin Actions - Organized into logical groups */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {/* Member Management */}
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openViewMembersModal(group)
                                  }}
                                  title="View Members"
                                  className="text-xs"
                                >
                                  👥 Members
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openInviteModal(group)
                                  }}
                                  title="Invite Users"
                                  className="text-xs"
                                >
                                  ➕ Invite
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openManageInvitationsModal(group)
                                  }}
                                  title="Manage Invitations"
                                  className="text-xs"
                                >
                                  📧 Invites
                                </Button>
                              </div>
                              
                              {/* Task Management */}
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openCreateTaskModal(group)
                                  }}
                                  title="Create Task"
                                  className="text-xs"
                                >
                                  📝 Create
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openManageTasksModal(group)
                                  }}
                                  title="Manage Tasks"
                                  className="text-xs"
                                >
                                  📋 Manage
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedGroup(group)
                                    setShowTaskApplicationsModal(true)
                                  }}
                                  title="Review Applications"
                                  className="text-xs"
                                >
                                  ✅ Review
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Member Groups */}
                {(() => {
                  const memberGroups = groups.filter(group => group.adminId !== user?.uid)
                  return memberGroups.length > 0 ? (
                    <div>
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <h4 className="text-sm font-medium text-gray-800">Member Groups</h4>
                        <span className="ml-2 text-xs text-gray-500">({memberGroups.length})</span>
                      </div>
                      <div className="space-y-3">
                        {memberGroups.map((group) => (
                          <div key={group.id} className="relative">
                            <GroupCard
                              group={group}
                              isAdmin={false}
                            />
                            <div className="absolute top-2 right-2">
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
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}
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

{/* Admin Dashboard Cards or Quick Actions */}
          {(() => {
            const isAdmin = groups.some(group => group.adminId === user?.uid)
            
if (isAdmin) {
              // Admin Dashboard - Action Center Card
              return (
                <div className="bg-white shadow rounded-lg p-6 border-l-4 border-orange-400">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">🚨 Action Center</h3>
                    <div className="flex items-center space-x-2">
                      {((adminTaskStats?.pendingApplications || 0) + (adminGroupStats?.pendingInvitations || 0) + (adminGroupStats?.pendingJoinRequests || 0)) > 0 && (
                        <div className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                          {(adminTaskStats?.pendingApplications || 0) + (adminGroupStats?.pendingInvitations || 0) + (adminGroupStats?.pendingJoinRequests || 0)} items need attention
                        </div>
                      )}
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  {loadingAdminData ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    </div>
                  ) : (
                    <>
                      {/* Urgent Items Summary */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="text-2xl font-bold text-red-600">{adminTaskStats?.pendingApplications || 0}</div>
                          <div className="text-xs text-red-700 font-medium">Task Applications</div>
                          <div className="text-xs text-red-500 mt-1">Waiting approval</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-2xl font-bold text-orange-600">{adminGroupStats?.pendingJoinRequests || 0}</div>
                          <div className="text-xs text-orange-700 font-medium">Join Requests</div>
                          <div className="text-xs text-orange-500 mt-1">Users want to join</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="text-2xl font-bold text-yellow-600">{adminGroupStats?.pendingInvitations || 0}</div>
                          <div className="text-xs text-yellow-700 font-medium">Invitations</div>
                          <div className="text-xs text-yellow-500 mt-1">Awaiting responses</div>
                        </div>
                      </div>

                      {/* Recent Urgent Items */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">⏰ Requires Immediate Action</h4>
{(pendingApplications.length > 0 || pendingJoinRequests.length > 0 || pendingInvitations.length > 0) ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {/* Pending Applications */}
                            {pendingApplications.slice(0, 1).map((app) => (
                              <div key={`app-${app.id}`} className="flex items-center justify-between p-3 bg-red-25 border border-red-100 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{app.userName}</div>
                                    <div className="text-xs text-gray-600">Task Application • {app.pointsAwarded}pts</div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const adminGroup = groups.find(g => g.adminId === user?.uid)
                                    if (adminGroup) {
                                      setSelectedGroup(adminGroup)
                                      setShowTaskApplicationsModal(true)
                                    }
                                  }}
                                  className="text-xs"
                                >
                                  Review
                                </Button>
                              </div>
                            ))}
                            
                            {/* Pending Join Requests */}
                            {pendingJoinRequests.slice(0, 1).map((request) => (
                              <div key={`join-${request.id}`} className="flex items-center justify-between p-3 bg-orange-25 border border-orange-100 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{request.userName}</div>
                                    <div className="text-xs text-gray-600">Join Request • {request.groupName}</div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => setShowJoinRequestsModal(true)}
                                  className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                  Review
                                </Button>
                              </div>
                            ))}
                            
                            {/* Pending Invitations */}
                            {pendingInvitations.slice(0, 1).map((invite) => (
                              <div key={`inv-${invite.id}`} className="flex items-center justify-between p-3 bg-yellow-25 border border-yellow-100 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{invite.inviteeEmail}</div>
                                    <div className="text-xs text-gray-600">Group Invitation • {invite.groupName}</div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const adminGroup = groups.find(g => g.adminId === user?.uid)
                                    if (adminGroup) openManageInvitationsModal(adminGroup)
                                  }}
                                  className="text-xs"
                                >
                                  Manage
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-2xl mb-2">✅</div>
                            <div className="text-sm font-medium">All caught up!</div>
                            <div className="text-xs">No urgent items need your attention</div>
                          </div>
                        )}
                      </div>

                      {/* Primary Actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => {
                            const adminGroup = groups.find(g => g.adminId === user?.uid)
                            if (adminGroup) {
                              setSelectedGroup(adminGroup)
                              setShowTaskApplicationsModal(true)
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={!adminTaskStats?.pendingApplications}
                        >
                          Review Applications
                          {adminTaskStats?.pendingApplications > 0 && (
                            <span className="ml-2 bg-red-800 text-red-100 px-2 py-1 rounded-full text-xs">
                              {adminTaskStats.pendingApplications}
                            </span>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            const adminGroup = groups.find(g => g.adminId === user?.uid)
                            if (adminGroup) openInviteModal(adminGroup)
                          }}
                          variant="outline"
                          className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                        >
                          Send Invites
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )
            } else {
              // Regular User Quick Actions
              return (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setShowTaskApplicationModal(true)}
                      className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition duration-200"
                    >
                      <div className="font-medium text-green-800">Apply Points</div>
                      <div className="text-sm text-green-600">Apply for task completion to earn points</div>
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
              )
            }
          })()}
        </div>

{/* Admin Invitation Card or Regular User Recent Activity */}
        <div className="grid grid-cols-1 gap-6">
          {(() => {
            const isAdmin = groups.some(group => group.adminId === user?.uid)
            
if (isAdmin) {
              // Admin Dashboard - Dashboard Overview Card
              return (
                <div className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-400">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">📊 Dashboard Overview</h3>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                  
                  {loadingAdminData ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <>
                      {/* Comprehensive Statistics */}
                      <div className="grid grid-cols-4 gap-3 mb-6">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-xl font-bold text-blue-600">{adminTaskStats?.totalActiveTasks || 0}</div>
                          <div className="text-xs text-blue-700">Active Tasks</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-xl font-bold text-green-600">{adminGroupStats?.totalMembers || 0}</div>
                          <div className="text-xs text-green-700">Total Members</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-xl font-bold text-purple-600">{adminTaskStats?.completedTasks || 0}</div>
                          <div className="text-xs text-purple-700">Completed Tasks</div>
                        </div>
                        <div className="text-center p-3 bg-indigo-50 rounded-lg">
                          <div className="text-xl font-bold text-indigo-600">{adminGroupStats?.totalGroups || 0}</div>
                          <div className="text-xs text-indigo-700">Groups Managed</div>
                        </div>
                      </div>

                      {/* Recent Activity Section */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">📈 Recent Activity</h4>
                        {loadingTransactions ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        ) : transactions.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {transactions.slice(0, 5).map((transaction) => (
                              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-2 h-2 rounded-full ${
                                    transaction.type === 'earn' ? 'bg-green-500' : 'bg-red-500'
                                  }`}></div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                                    <div className="text-xs text-gray-500">
                                      {transaction.createdAt instanceof Date 
                                        ? transaction.createdAt.toLocaleDateString()
                                        : transaction.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                                    </div>
                                  </div>
                                </div>
                                <div className={`font-medium text-sm ${
                                  transaction.type === 'earn' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {transaction.type === 'earn' ? '+' : '-'}{transaction.amount}pts
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                            <div className="text-sm">No recent activity</div>
                          </div>
                        )}
                      </div>

                      {/* Performance Insights */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">💡 Insights</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <div className="text-xs text-emerald-700 font-medium">Recent Growth</div>
                            <div className="text-sm text-emerald-600">
                              +{adminGroupStats?.recentJoins || 0} new members this week
                            </div>
                          </div>
                          <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                            <div className="text-xs text-sky-700 font-medium">Avg Members/Group</div>
                            <div className="text-sm text-sky-600">
                              {adminGroupStats?.averageMembersPerGroup ? 
                                Math.round(adminGroupStats.averageMembersPerGroup * 10) / 10 : 0} members
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Management Actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => {
                            const adminGroup = groups.find(g => g.adminId === user?.uid)
                            if (adminGroup) openCreateTaskModal(adminGroup)
                          }}
                          variant="outline"
                          className="border-blue-400 text-blue-600 hover:bg-blue-50"
                        >
                          Create New Task
                        </Button>
                        <Button
                          onClick={() => {
                            const adminGroup = groups.find(g => g.adminId === user?.uid)
                            if (adminGroup) openViewMembersModal(adminGroup)
                          }}
                          variant="outline"
                          className="border-green-400 text-green-600 hover:bg-green-50"
                        >
                          View All Members
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )
            } else {
              // Regular User Recent Activity
              return (
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
                              {transaction.createdAt instanceof Date 
                                ? transaction.createdAt.toLocaleDateString()
                                : transaction.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
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
              )
            }
          })()}
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
          onMemberClick={selectedGroup.adminId === user.uid ? handleMemberClick : undefined}
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

      {selectedGroup && selectedMember && (
        <AwardPointsModal
          isOpen={showAwardPointsModal}
          onClose={() => {
            setShowAwardPointsModal(false)
            setSelectedMember(null)
          }}
          member={selectedMember}
          groupId={selectedGroup.id}
          onAwardPoints={handleAwardPoints}
        />
      )}

      {user && userProfile && (
        <TaskApplicationModal
          isOpen={showTaskApplicationModal}
          onClose={() => setShowTaskApplicationModal(false)}
          userId={user.uid}
          userName={userProfile.name}
          onApplicationSubmitted={handleApplicationSubmitted}
        />
      )}

      {selectedGroup && user && userProfile && (
        <TaskApplicationsModal
          isOpen={showTaskApplicationsModal}
          onClose={() => {
            setShowTaskApplicationsModal(false)
            setSelectedGroup(null)
          }}
          group={selectedGroup}
          adminId={user.uid}
          adminName={userProfile.name}
          onApplicationProcessed={handleApplicationProcessed}
        />
      )}

      {user && userProfile && (
        <ReviewJoinRequestsModal
          isOpen={showJoinRequestsModal}
          onClose={() => setShowJoinRequestsModal(false)}
          adminId={user.uid}
          adminName={userProfile.name}
          onRequestProcessed={loadAdminData}
        />
      )}
    </div>
  )
}