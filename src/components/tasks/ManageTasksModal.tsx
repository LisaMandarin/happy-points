'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Alert, Badge, LoadingSpinner } from '@/components/ui'
import { GroupTask, Group } from '@/types'
import { getGroupTasks, deleteGroupTask, updateGroupTask } from '@/lib/tasks'
import { formatDate, formatPoints } from '@/lib/utils'

interface ManageTasksModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  currentUserId: string
  onEditTask: (task: GroupTask) => void
}

const ManageTasksModal: React.FC<ManageTasksModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUserId,
  onEditTask
}) => {
  const [tasks, setTasks] = useState<GroupTask[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadTasks()
    }
  }, [isOpen, group.id])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const groupTasks = await getGroupTasks(group.id)
      setTasks(groupTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTask = async (task: GroupTask) => {
    if (!confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      setActionLoading(task.id)
      setError(null)
      await deleteGroupTask(task.id)
      setSuccess('Task deleted successfully!')
      await loadTasks()
      clearMessages()
    } catch (error) {
      setError('Failed to delete task')
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleActive = async (task: GroupTask) => {
    try {
      setActionLoading(task.id)
      setError(null)
      await updateGroupTask(task.id, { isActive: !task.isActive })
      setSuccess(`Task ${task.isActive ? 'deactivated' : 'activated'} successfully!`)
      await loadTasks()
      clearMessages()
    } catch (error) {
      setError('Failed to update task')
      clearMessages()
    } finally {
      setActionLoading(null)
    }
  }

  const clearMessages = () => {
    setTimeout(() => {
      setSuccess(null)
      setError(null)
    }, 3000)
  }

  const getStatusBadge = (task: GroupTask) => {
    if (task.isActive) {
      return <Badge variant="success" size="sm">Active</Badge>
    } else {
      return <Badge variant="default" size="sm">Inactive</Badge>
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Tasks - ${group.name}`}
      size="lg"
      footer={
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {tasks.length} total tasks
          </span>
          <Button onClick={onClose}>
            Done
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
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className={`border rounded-lg p-4 ${
                  task.isActive ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {task.title}
                      </h4>
                      {getStatusBadge(task)}
                      <Badge variant="info" size="sm">
                        {formatPoints(task.points)} pts
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {task.description}
                    </p>
                    
                    <div className="text-xs text-gray-500">
                      <p>Created {formatDate(task.createdAt)} by {task.createdByName}</p>
                      {task.updatedAt !== task.createdAt && (
                        <p>Last updated {formatDate(task.updatedAt)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Task Actions */}
                <div className="flex justify-end space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditTask(task)}
                    disabled={!!actionLoading}
                  >
                    Edit
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={task.isActive ? "outline" : "success"}
                    onClick={() => handleToggleActive(task)}
                    loading={actionLoading === task.id}
                    disabled={!!actionLoading}
                  >
                    {task.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteTask(task)}
                    loading={actionLoading === task.id}
                    disabled={!!actionLoading}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">No tasks created yet</p>
            <p className="text-sm text-gray-400">
              Create your first task to start assigning points to group members
            </p>
          </div>
        )}

        {/* Task Summary */}
        {tasks.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Task Summary:
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-800 font-medium">
                  {tasks.filter(t => t.isActive).length}
                </span>
                <span className="text-blue-600 ml-1">Active</span>
              </div>
              <div>
                <span className="text-blue-800 font-medium">
                  {tasks.filter(t => !t.isActive).length}
                </span>
                <span className="text-blue-600 ml-1">Inactive</span>
              </div>
              <div>
                <span className="text-blue-800 font-medium">
                  {tasks.reduce((sum, task) => sum + (task.isActive ? task.points : 0), 0).toLocaleString()}
                </span>
                <span className="text-blue-600 ml-1">Total Active Points</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ManageTasksModal