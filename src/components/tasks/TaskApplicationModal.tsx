'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Alert, LoadingSpinner } from '@/components/ui'
import { Group, GroupTask } from '@/types'
import { getActiveGroupTasks, completeTask } from '@/lib/tasks'
import { getUserGroups } from '@/lib/groups'

interface TaskApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  onApplicationSubmitted: () => void
}

const TaskApplicationModal: React.FC<TaskApplicationModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  onApplicationSubmitted
}) => {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [tasks, setTasks] = useState<GroupTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadGroups()
      resetForm()
    }
  }, [isOpen, userId])

  useEffect(() => {
    if (selectedGroupId) {
      loadTasks(selectedGroupId)
    } else {
      setTasks([])
      setSelectedTaskId('')
    }
  }, [selectedGroupId])

  const loadGroups = async () => {
    try {
      setLoading(true)
      setError(null)
      const userGroups = await getUserGroups(userId)
      setGroups(userGroups)
    } catch (error) {
      console.error('Error loading groups:', error)
      setError('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async (groupId: string) => {
    try {
      setLoadingTasks(true)
      setError(null)
      const groupTasks = await getActiveGroupTasks(groupId)
      setTasks(groupTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
      setError('Failed to load tasks')
    } finally {
      setLoadingTasks(false)
    }
  }

  const resetForm = () => {
    setSelectedGroupId('')
    setSelectedTaskId('')
    setError(null)
    setSuccessMessage(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const getSelectedTask = () => {
    return tasks.find(task => task.id === selectedTaskId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedGroupId) {
      setError('Please select a group')
      return
    }

    if (!selectedTaskId) {
      setError('Please select a task')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccessMessage(null)
      
      await completeTask(selectedTaskId, userId, userName)
      
      setSuccessMessage('Task application submitted successfully! Waiting for admin approval.')
      onApplicationSubmitted()
      
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit task application')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedTask = getSelectedTask()

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Apply for Task Completion"
      size="md"
      footer={
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-application-form"
            disabled={submitting || loading || !selectedTaskId}
          >
            {submitting ? <LoadingSpinner size="sm" /> : 'Submit Application'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success">
            {successMessage}
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-2 text-gray-600">Loading groups...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">You're not a member of any groups yet</p>
            <p className="text-sm text-gray-400">Join a group to apply for task completion</p>
          </div>
        ) : (
          <form id="task-application-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2">
                Select Group
              </label>
              <select
                id="group"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Choose a group...</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedGroupId && (
              <div>
                <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Task
                </label>
                {loadingTasks ? (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2 text-gray-600">Loading tasks...</span>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-md">
                    No active tasks available in this group
                  </div>
                ) : (
                  <select
                    id="task"
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Choose a task...</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title} ({task.points} points)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {selectedTask && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Task Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Title:</span>
                    <p className="text-blue-700">{selectedTask.title}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Description:</span>
                    <p className="text-blue-700">{selectedTask.description}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Points:</span>
                    <p className="text-blue-700 font-semibold">{selectedTask.points} points</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Created by:</span>
                    <p className="text-blue-700">{selectedTask.createdByName}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedTask && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      Application Notice
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your application will be sent to the group admin for review. You'll earn {selectedTask.points} points once approved.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </Modal>
  )
}

export default TaskApplicationModal