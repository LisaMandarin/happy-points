'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Alert, LoadingSpinner, Badge } from '@/components/ui'
import { Group, GroupTask } from '@/types'
import { getActiveGroupTasks, completeTask, getGroupTaskCompletions } from '@/lib/tasks'
import { formatDate, formatPoints } from '@/lib/utils'

interface ViewTasksModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  userId: string
  userName: string
  onTaskClaimed: () => void
}

const ViewTasksModal: React.FC<ViewTasksModalProps> = ({
  isOpen,
  onClose,
  group,
  userId,
  userName,
  onTaskClaimed
}) => {
  const [tasks, setTasks] = useState<GroupTask[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, group.id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load active tasks and user's completions in parallel
      const [activeTasks, userCompletions] = await Promise.all([
        getActiveGroupTasks(group.id),
        getGroupTaskCompletions(group.id)
      ])
      
      setTasks(activeTasks)
      // Filter completions to only this user
      setCompletions(userCompletions.filter(completion => completion.userId === userId))
    } catch (error) {
      console.error('Error loading tasks:', error)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimTask = async (task: GroupTask) => {
    try {
      setClaimingTaskId(task.id)
      setError(null)
      
      await completeTask(task.id, userId, userName)
      
      setSuccess(`Successfully claimed "${task.title}" for ${task.points} points!`)
      onTaskClaimed()
      await loadData() // Reload to update completion count
      clearMessages()
    } catch (error) {
      console.error('Error claiming task:', error)
      setError(error instanceof Error ? error.message : 'Failed to claim task')
      clearMessages()
    } finally {
      setClaimingTaskId(null)
    }
  }

  const clearMessages = () => {
    setTimeout(() => {
      setSuccess(null)
      setError(null)
    }, 3000)
  }


  const hasPendingCompletion = (taskId: string) => {
    return completions.some(completion => 
      completion.taskId === taskId && completion.status === 'pending'
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Available Tasks - ${group.name}`}
      size="lg"
      footer={
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {tasks.length} active tasks
          </span>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {(success || error) && (
          <div>
            {success && <Alert variant="success">{success}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {tasks.map((task) => {
              const pending = hasPendingCompletion(task.id)
              
              return (
                <div 
                  key={task.id} 
                  className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {task.title}
                        </h4>
                        <Badge variant="success" size="sm">
                          {formatPoints(task.points)} pts
                        </Badge>
                        {pending && (
                          <Badge variant="warning" size="sm">
                            Pending Approval
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {task.description}
                      </p>
                      
                      <div className="text-xs text-gray-500">
                        <p>Created {formatDate(task.createdAt)} by {task.createdByName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleClaimTask(task)}
                      loading={claimingTaskId === task.id}
                      disabled={!!claimingTaskId}
                    >
                      {pending ? 'Claim Again' : 'Claim Task'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
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
        )}

        {/* My Task Completions */}
        {completions.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-3">
              My Points Claimed ({completions.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {completions.map((completion) => {
                const task = tasks.find(t => t.id === completion.taskId)
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
                          <p><span className="font-medium">Points:</span> {completion.pointsAwarded}</p>
                          <p><span className="font-medium">Claimed:</span> {formatDate(completion.completedAt)}</p>
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
          </div>
        )}

        {/* Task Summary */}
        {tasks.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              💡 Task Claiming:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Tasks can be completed multiple times</li>
              <li>• Your claims need admin approval to earn points</li>
              <li>• Check your completion history above</li>
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ViewTasksModal