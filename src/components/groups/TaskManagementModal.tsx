'use client'

import React, { useState } from 'react'
import { Modal, Button, Tabs } from 'antd'
import { Group, UserProfile } from '@/types'
import CreateTaskModal from '../tasks/CreateTaskModal'
import TaskApplicationsModal from '../tasks/TaskApplicationsModal'
import ViewTasksModal from '../tasks/ViewTasksModal'
import { getGroupTaskCompletions, approveTaskCompletion, rejectTaskCompletion, getTask, getGroupTasks, deleteGroupTask, updateGroupTask } from '@/lib/tasks'
import { formatDate, formatPoints } from '@/lib/utils'
import { getApplicationStatusBadge, getTaskStatusBadge } from '@/lib/utils/statusBadges'
import { useModalData } from '@/hooks/useModalData'
import { useApproveReject } from '@/hooks/useApproveReject'
import { TaskCompletion, GroupTask } from '@/types'
import { LoadingSpinner, Alert, Badge } from '@/components/ui'

interface TaskManagementModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUser: UserProfile | null
  onCreateTask: (taskData: { title: string; description: string; points: number }) => Promise<void>
  onUpdateTask: (taskId: string, taskData: { title: string; description: string; points: number }) => Promise<void>
  onApplicationProcessed: () => void
  onTaskClaimed: () => void
}

const TaskManagementModal: React.FC<TaskManagementModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  onCreateTask,
  onUpdateTask,
  onApplicationProcessed,
  onTaskClaimed,
}) => {
  const isAdmin = currentUser?.id === group.adminId
  const [activeTab, setActiveTab] = useState(isAdmin ? 'manage' : 'available')
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showTaskApplicationsModal, setShowTaskApplicationsModal] = useState(false)
  const [showViewTasksModal, setShowViewTasksModal] = useState(false)
  const [showProcessedApplicationsModal, setShowProcessedApplicationsModal] = useState(false)
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [taskSuccess, setTaskSuccess] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<GroupTask | null>(null)

  // Task application data and handlers for admin
  interface TaskCompletionWithTask extends TaskCompletion {
    taskTitle?: string
    taskDescription?: string
  }

  const loadApplications = async (): Promise<TaskCompletionWithTask[]> => {
    if (!isAdmin) return []
    
    const completions = await getGroupTaskCompletions(group.id)
    
    // Get task details for each completion
    const completionsWithTasks = await Promise.all(
      completions.map(async (completion) => {
        try {
          const task = await getTask(completion.taskId)
          return {
            ...completion,
            taskTitle: task?.title || 'Unknown Task',
            taskDescription: task?.description || '',
          }
        } catch (error) {
          console.error(`Error fetching task ${completion.taskId}:`, error)
          return {
            ...completion,
            taskTitle: 'Unknown Task',
            taskDescription: '',
          }
        }
      })
    )
    
    return completionsWithTasks
  }

  const { data: applications, loading: loadingApplications, error: applicationsError, reload: reloadApplications } = useModalData<TaskCompletionWithTask[]>({
    loadDataFn: loadApplications,
    dependencies: [isOpen, group.id, isAdmin, activeTab],
    errorMessage: 'Failed to load task applications'
  })

  const {
    handleApprove,
    handleReject,
    approvingId,
    rejectingId,
    error: processError,
    successMessage: processSuccessMessage
  } = useApproveReject({
    approveAction: approveTaskCompletion,
    rejectAction: rejectTaskCompletion,
    onProcessed: onApplicationProcessed,
    refreshData: reloadApplications,
    approveSuccessMessage: 'Task application approved successfully!',
    rejectSuccessMessage: 'Task application rejected.',
    approveErrorMessage: 'Failed to approve application',
    rejectErrorMessage: 'Failed to reject application'
  })

  const pendingApplications = applications?.filter(app => app.status === 'pending') || []
  const processedApplications = applications?.filter(app => app.status !== 'pending') || []

  // Task management data and handlers
  const loadTasks = async (): Promise<GroupTask[]> => {
    if (!isAdmin) return []
    return await getGroupTasks(group.id)
  }

  const { data: tasks, loading: loadingTasks, error: tasksError, reload: reloadTasks } = useModalData<GroupTask[]>({
    loadDataFn: loadTasks,
    dependencies: [isOpen, group.id, isAdmin, activeTab],
    errorMessage: 'Failed to load tasks'
  })

  // Member tasks data loading (always call hooks at top level)
  const loadMemberTasks = async (): Promise<GroupTask[]> => {
    if (isAdmin) return []
    const tasks = await getGroupTasks(group.id)
    return tasks.filter(task => task.isActive)
  }

  const { data: memberTasks, loading: loadingMemberTasks, error: memberTasksError } = useModalData<GroupTask[]>({
    loadDataFn: loadMemberTasks,
    dependencies: [isOpen, group.id, activeTab],
    errorMessage: 'Failed to load available tasks'
  })

  const loadMemberCompletions = async (): Promise<TaskCompletion[]> => {
    if (isAdmin || !currentUser?.id) return []
    const completions = await getGroupTaskCompletions(group.id)
    return completions.filter(completion => completion.userId === currentUser.id)
  }

  const { data: memberCompletions, loading: loadingMemberCompletions, error: memberCompletionsError, reload: reloadMemberCompletions } = useModalData<TaskCompletion[]>({
    loadDataFn: loadMemberCompletions,
    dependencies: [isOpen, group.id, currentUser?.id, activeTab],
    errorMessage: 'Failed to load task completions'
  })

  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)
  const [showFullHistory, setShowFullHistory] = useState(false)

  const handleClaimTask = async (task: GroupTask) => {
    if (!currentUser) return
    
    try {
      setClaimingTaskId(task.id)
      setClaimError(null)
      
      const { completeTask } = await import('@/lib/tasks')
      await completeTask(task.id, currentUser.id, currentUser.name)
      
      setClaimSuccess(`Successfully claimed "${task.title}" for ${task.points} points!`)
      onTaskClaimed()
      await reloadMemberCompletions()
      
      setTimeout(() => setClaimSuccess(null), 3000)
    } catch (error) {
      console.error('Error claiming task:', error)
      setClaimError(error instanceof Error ? error.message : 'Failed to claim task')
      setTimeout(() => setClaimError(null), 3000)
    } finally {
      setClaimingTaskId(null)
    }
  }

  const hasPendingCompletion = (taskId: string) => {
    return memberCompletions?.some(completion => 
      completion.taskId === taskId && completion.status === 'pending'
    )
  }

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const handleTaskToggleActive = async (task: GroupTask) => {
    try {
      setTaskActionLoading(task.id)
      setTaskError(null)
      
      await updateGroupTask(task.id, {
        isActive: !task.isActive
      })
      
      setTaskSuccess(`Task ${task.isActive ? 'deactivated' : 'activated'} successfully`)
      await reloadTasks()
      
      // Clear success message after 3 seconds
      setTimeout(() => setTaskSuccess(null), 3000)
    } catch (error) {
      console.error('Error toggling task status:', error)
      setTaskError('Failed to update task status')
      setTimeout(() => setTaskError(null), 3000)
    } finally {
      setTaskActionLoading(null)
    }
  }

  const handleTaskDelete = async (task: GroupTask) => {
    if (!window.confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      setTaskActionLoading(task.id)
      setTaskError(null)
      
      await deleteGroupTask(task.id)
      
      setTaskSuccess('Task deleted successfully')
      await reloadTasks()
      
      // Clear success message after 3 seconds
      setTimeout(() => setTaskSuccess(null), 3000)
    } catch (error) {
      console.error('Error deleting task:', error)
      setTaskError('Failed to delete task')
      setTimeout(() => setTaskError(null), 3000)
    } finally {
      setTaskActionLoading(null)
    }
  }

  const handleTabAction = (action: string) => {
    switch (action) {
      case 'create':
        setShowCreateTaskModal(true)
        break
      case 'edit-task':
        setShowEditTaskModal(true)
        break
      case 'applications':
        setShowTaskApplicationsModal(true)
        break
      case 'view':
        setShowViewTasksModal(true)
        break
      case 'processed-applications':
        setShowProcessedApplicationsModal(true)
        break
    }
  }

  const closeSubModals = () => {
    setShowCreateTaskModal(false)
    setShowTaskApplicationsModal(false)
    setShowViewTasksModal(false)
    setShowProcessedApplicationsModal(false)
    setShowEditTaskModal(false)
    setShowFullHistory(false) // Reset to show pending only when closing
  }

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey)
    setShowFullHistory(false) // Reset to pending only when switching tabs
  }


  const tabItems = []

  if (isAdmin) {
    tabItems.push(
      {
        key: 'manage',
        label: '📝 Manage Tasks',
        children: (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium text-gray-900">
                Group Tasks ({tasks?.length || 0})
              </h4>
            </div>
            
            {(tasksError || taskError) && (
              <Alert variant="error">
                {tasksError || taskError}
              </Alert>
            )}
            
            {taskSuccess && (
              <Alert variant="success">
                {taskSuccess}
              </Alert>
            )}
            
            {loadingTasks ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
                <span className="ml-2 text-gray-600">Loading tasks...</span>
              </div>
            ) : !tasks || tasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">No tasks created yet</p>
                <p className="text-sm text-gray-400">Create your first task to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`border rounded-lg transition-all duration-200 ${
                      task.isActive 
                        ? 'bg-white border-gray-200 hover:border-gray-300' 
                        : 'bg-gray-50 border-gray-300 opacity-75'
                    }`}
                  >
                    {/* Task Header - Always Visible */}
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 
                              className={`font-medium cursor-pointer hover:text-blue-600 transition-colors ${
                                task.isActive ? 'text-gray-900' : 'text-gray-500'
                              }`}
                              onClick={() => toggleTaskExpanded(task.id)}
                            >
                              {task.isActive ? task.title : (
                                <span className="line-through">{task.title}</span>
                              )}
                              <span className="ml-2 text-gray-400">
                                {expandedTasks.has(task.id) ? '▼' : '▶'}
                              </span>
                            </h5>
                            {getTaskStatusBadge(task)}
                            <Badge variant="info" size="sm">
                              {formatPoints(task.points)} pts
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-2 ml-4">
                          <Button
                            onClick={() => {
                              setSelectedTask(task)
                              handleTabAction('edit-task')
                            }}
                            disabled={!!taskActionLoading}
                            className="px-3 py-1 text-sm"
                          >
                            ✏️ Edit
                          </Button>
                          
                          <Button
                            onClick={() => handleTaskToggleActive(task)}
                            disabled={!!taskActionLoading}
                            className={`px-3 py-1 text-sm ${
                              task.isActive 
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {taskActionLoading === task.id ? (
                              <LoadingSpinner size="sm" />
                            ) : task.isActive ? (
                              '⏸️ Deactivate'
                            ) : (
                              '▶️ Activate'
                            )}
                          </Button>
                          
                          <Button
                            onClick={() => handleTaskDelete(task)}
                            disabled={!!taskActionLoading}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            {taskActionLoading === task.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              '🗑️ Delete'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Collapsible Content */}
                    {expandedTasks.has(task.id) && (
                      <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                        <div className="pt-3 space-y-3">
                          <div>
                            <h6 className="text-sm font-medium text-gray-700 mb-1">Description</h6>
                            <p className="text-sm text-gray-600">{task.description}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                            <div>
                              <span className="font-medium">Created:</span> {formatDate(task.createdAt)}
                            </div>
                            <div>
                              <span className="font-medium">Creator:</span> {task.createdByName}
                            </div>
                            {task.updatedAt !== task.createdAt && (
                              <>
                                <div>
                                  <span className="font-medium">Updated:</span> {formatDate(task.updatedAt)}
                                </div>
                                <div>
                                  <span className="font-medium">Updated by:</span> {task.createdByName || 'Unknown'}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Create New Task Button at Bottom */}
            <div className="pt-4 border-t border-gray-200">
              <Button 
                type="primary" 
                onClick={() => handleTabAction('create')}
                className="w-full"
                disabled={loadingTasks}
              >
                ➕ Create New Task
              </Button>
            </div>
          </div>
        )
      },
      {
        key: 'applications',
        label: '📋 Review Applications',
        children: (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium text-gray-900">
                Pending Applications ({pendingApplications.length})
              </h4>
              {processedApplications.length > 0 && (
                <Button onClick={() => handleTabAction('processed-applications')}>
                  📜 View History ({processedApplications.length})
                </Button>
              )}
            </div>
            
            {(applicationsError || processError) && (
              <Alert variant="error">
                {applicationsError || processError}
              </Alert>
            )}
            
            {processSuccessMessage && (
              <Alert variant="success">
                {processSuccessMessage}
              </Alert>
            )}
            
            {loadingApplications ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
                <span className="ml-2 text-gray-600">Loading applications...</span>
              </div>
            ) : pendingApplications.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-2">No pending applications</p>
                <p className="text-sm text-gray-400">Applications will appear here when members apply for tasks</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingApplications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h5 className="font-medium text-gray-900">
                            {application.taskTitle}
                          </h5>
                          {getApplicationStatusBadge(application.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {application.taskDescription}
                        </p>
                        <div className="text-sm text-gray-500 space-y-1">
                          <p><span className="font-medium">Applicant:</span> {application.userName}</p>
                          <p><span className="font-medium">Points:</span> {application.pointsAwarded}</p>
                          <p><span className="font-medium">Applied:</span> {formatDate(application.completedAt)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => currentUser && handleApprove(application.id, currentUser.id, currentUser.name)}
                        disabled={approvingId === application.id || rejectingId === application.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
                      >
                        {approvingId === application.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          'Approve'
                        )}
                      </Button>
                      <Button
                        onClick={() => currentUser && handleReject(application.id, currentUser.id, currentUser.name, 'Declined by admin')}
                        disabled={approvingId === application.id || rejectingId === application.id}
                        className="border-red-300 text-red-700 hover:bg-red-50 px-3 py-1 text-sm border"
                      >
                        {rejectingId === application.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          'Reject'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }
    )
  } else {
    tabItems.push(
      {
        key: 'available',
        label: '📋 Available Tasks',
        children: (
          <div className="space-y-4">
            {(memberTasksError || claimError) && (
              <Alert variant="error">
                {memberTasksError || claimError}
              </Alert>
            )}
            
            {claimSuccess && (
              <Alert variant="success">
                {claimSuccess}
              </Alert>
            )}
            
            {loadingMemberTasks ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
                <span className="ml-2 text-gray-600">Loading tasks...</span>
              </div>
            ) : !memberTasks || memberTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-2">No active tasks available</p>
                <p className="text-sm text-gray-400">
                  Check back later for new tasks from your group admin
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {memberTasks.map((task) => {
                  const pending = hasPendingCompletion(task.id)
                  
                  return (
                    <div 
                      key={task.id} 
                      className="border rounded-lg transition-all duration-200 bg-white border-gray-200 hover:border-gray-300"
                    >
                      {/* Task Header - Always Visible */}
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 
                                className="font-medium cursor-pointer hover:text-blue-600 transition-colors text-gray-900"
                                onClick={() => toggleTaskExpanded(task.id)}
                              >
                                {task.title}
                                <span className="ml-2 text-gray-400">
                                  {expandedTasks.has(task.id) ? '▼' : '▶'}
                                </span>
                              </h4>
                              {pending && (
                                <Badge variant="warning" size="sm">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Claim Button */}
                          <div className="ml-4">
                            <Button
                              onClick={() => handleClaimTask(task)}
                              disabled={!!claimingTaskId}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                            >
                              {claimingTaskId === task.id ? (
                                <LoadingSpinner size="sm" />
                              ) : pending ? (
                                'Claim Again'
                              ) : (
                                'Claim Task'
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Collapsible Content */}
                      {expandedTasks.has(task.id) && (
                        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                          <div className="pt-3 space-y-3">
                            <div>
                              <h6 className="text-sm font-medium text-gray-700 mb-1">Description</h6>
                              <p className="text-sm text-gray-600">{task.description}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                              <div>
                                <span className="font-medium">Points:</span> {formatPoints(task.points)}
                              </div>
                              <div>
                                <span className="font-medium">Creator:</span> {task.createdByName}
                              </div>
                              <div>
                                <span className="font-medium">Created:</span> {formatDate(task.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      },
      {
        key: 'my-applications',
        label: '📊 My Applications',
        children: (
          <div className="space-y-4">
            {memberCompletionsError && (
              <Alert variant="error">
                {memberCompletionsError}
              </Alert>
            )}
            
            {loadingMemberCompletions ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
                <span className="ml-2 text-gray-600">Loading applications...</span>
              </div>
            ) : !memberCompletions || memberCompletions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-2">No applications yet</p>
                <p className="text-sm text-gray-400">
                  Complete tasks from the Available Tasks tab to see your applications here
                </p>
              </div>
            ) : (
              <>
                {/* Points Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-blue-900 mb-3">
                    Points Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPoints(memberCompletions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.pointsAwarded, 0))}
                      </div>
                      <div className="text-sm text-gray-600">Points Earned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatPoints(memberCompletions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.pointsAwarded, 0))}
                      </div>
                      <div className="text-sm text-gray-600">Points Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {memberCompletions.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Applications</div>
                    </div>
                  </div>
                </div>

                {/* Applications Section */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-gray-900">
                      {showFullHistory 
                        ? `Application History (${memberCompletions.length})`
                        : `Pending Applications (${memberCompletions.filter(c => c.status === 'pending').length})`
                      }
                    </h4>
                    {memberCompletions.length > 0 && (
                      <button
                        onClick={() => setShowFullHistory(!showFullHistory)}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        {showFullHistory ? 'Show Pending Only' : 'View Full History'}
                      </button>
                    )}
                  </div>
                  
                  {(() => {
                    const displayCompletions = showFullHistory 
                      ? memberCompletions 
                      : memberCompletions.filter(c => c.status === 'pending')
                    
                    if (displayCompletions.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <div className="text-gray-400 mb-2">
                            <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 text-sm">
                            {showFullHistory 
                              ? 'No applications found'
                              : 'No pending applications'
                            }
                          </p>
                        </div>
                      )
                    }
                    
                    return (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {displayCompletions.map((completion) => {
                          const task = memberTasks?.find(t => t.id === completion.taskId)
                          return (
                            <div 
                              key={completion.id}
                              className={`p-3 rounded-lg border ${
                                completion.status === 'approved' 
                                  ? 'bg-green-50 border-green-200'
                                  : completion.status === 'rejected'
                                  ? 'bg-red-50 border-red-200' 
                                  : 'bg-yellow-50 border-yellow-200'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h5 className="font-medium text-gray-900">
                                      {task?.title || 'Unknown Task'}
                                    </h5>
                                    <Badge 
                                      variant={
                                        completion.status === 'approved' 
                                          ? 'success' 
                                          : completion.status === 'rejected' 
                                          ? 'error' 
                                          : 'warning'
                                      } 
                                      size="sm"
                                    >
                                      {completion.status.charAt(0).toUpperCase() + completion.status.slice(1)}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <p><span className="font-medium">Points:</span> {formatPoints(completion.pointsAwarded)}</p>
                                    <p><span className="font-medium">Applied:</span> {formatDate(completion.completedAt)}</p>
                                    {completion.approvedAt && (
                                      <p><span className="font-medium">Processed:</span> {formatDate(completion.approvedAt)}</p>
                                    )}
                                    {completion.rejectionReason && (
                                      <p><span className="font-medium">Reason:</span> {completion.rejectionReason}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()
                }</div>
              </>
            )}
          </div>
        )
      }
    )
  }

  return (
    <>
      <Modal
        title={`Task Management - ${group.name}`}
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
          onChange={handleTabChange}
          items={tabItems}
        />
      </Modal>

      {/* Sub-modals */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={closeSubModals}
        onCreateTask={async (taskData: any) => {
          await onCreateTask?.(taskData)
          await reloadTasks()
          closeSubModals()
        }}
      />
      
      <CreateTaskModal
        isOpen={showEditTaskModal}
        onClose={closeSubModals}
        onCreateTask={onCreateTask}
        editingTask={selectedTask}
        onUpdateTask={async (taskId: string, updateData: any) => {
          await onUpdateTask?.(taskId, updateData)
          await reloadTasks()
          closeSubModals()
        }}
      />
      
      
      <TaskApplicationsModal
        isOpen={showTaskApplicationsModal || showProcessedApplicationsModal}
        onClose={closeSubModals}
        group={group}
        adminId={currentUser?.id || ''}
        adminName={currentUser?.name || ''}
        onApplicationProcessed={onApplicationProcessed}
        showProcessedOnly={showProcessedApplicationsModal}
      />
      
      <ViewTasksModal
        isOpen={showViewTasksModal}
        onClose={closeSubModals}
        group={group}
        userId={currentUser?.id || ''}
        userName={currentUser?.name || ''}
        onTaskClaimed={onTaskClaimed}
      />
    </>
  )
}

export default TaskManagementModal