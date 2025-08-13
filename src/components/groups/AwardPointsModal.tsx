'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Alert, LoadingSpinner } from '@/components/ui'
import { GroupMember, GroupTask } from '@/types'
import { getActiveGroupTasks } from '@/lib/tasks'

interface AwardPointsModalProps {
  isOpen: boolean
  onClose: () => void
  member: GroupMember | null
  groupId: string | undefined
  onAwardPoints: (memberId: string, taskId: string, points: number) => Promise<void>
}

const AwardPointsModal: React.FC<AwardPointsModalProps> = ({
  isOpen,
  onClose,
  member,
  groupId,
  onAwardPoints
}) => {
  const [tasks, setTasks] = useState<GroupTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [customPoints, setCustomPoints] = useState<string>('')
  const [useCustomPoints, setUseCustomPoints] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && groupId) {
      loadTasks()
      resetForm()
    }
  }, [isOpen, groupId])

  const loadTasks = async () => {
    if (!groupId) return
    
    try {
      setLoading(true)
      setError(null)
      const groupTasks = await getActiveGroupTasks(groupId)
      setTasks(groupTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedTaskId('')
    setCustomPoints('')
    setUseCustomPoints(false)
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const getSelectedTask = () => {
    return tasks.find(task => task.id === selectedTaskId)
  }

  const getPointsToAward = () => {
    if (useCustomPoints) {
      const points = parseInt(customPoints)
      return isNaN(points) ? 0 : points
    }
    const selectedTask = getSelectedTask()
    return selectedTask ? selectedTask.points : 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTaskId && !useCustomPoints) {
      setError('Please select a task or enter custom points')
      return
    }

    if (useCustomPoints) {
      const points = parseInt(customPoints)
      if (isNaN(points) || points <= 0) {
        setError('Please enter a valid number of points')
        return
      }
    }

    if (!member) {
      setError('Member data not available')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const pointsToAward = getPointsToAward()
      await onAwardPoints(member.userId, selectedTaskId, pointsToAward)
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to award points')
    } finally {
      setSubmitting(false)
    }
  }

  // Don't render if essential data is missing
  if (!member || !groupId) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Award Points to ${member.userName}`}
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
            form="award-points-form"
            disabled={submitting || loading}
          >
            {submitting ? <LoadingSpinner size="sm" /> : 'Award Points'}
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

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Member Information</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Name:</span> {member.userName}</p>
            <p><span className="font-medium">Email:</span> {member.userEmail}</p>
            <p><span className="font-medium">Current Points Earned:</span> {member.pointsEarned?.toLocaleString() || 0}</p>
          </div>
        </div>

        <form id="award-points-form" onSubmit={handleSubmit} className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
              <span className="ml-2 text-gray-600">Loading tasks...</span>
            </div>
          ) : (
            <>
              <div>
                <label className="flex items-center space-x-2 mb-3">
                  <input
                    type="radio"
                    name="pointsType"
                    checked={!useCustomPoints}
                    onChange={() => setUseCustomPoints(false)}
                    className="text-blue-600"
                  />
                  <span className="font-medium text-gray-900">Award points for completing a task</span>
                </label>
                
                {!useCustomPoints && (
                  <div className="ml-6">
                    <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Task
                    </label>
                    <select
                      id="task"
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={!useCustomPoints}
                    >
                      <option value="">Choose a task...</option>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title} ({task.points} points)
                        </option>
                      ))}
                    </select>
                    
                    {selectedTaskId && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-md">
                        <div className="text-sm">
                          <p className="font-medium text-blue-900">{getSelectedTask()?.title}</p>
                          <p className="text-blue-700 mt-1">{getSelectedTask()?.description}</p>
                          <p className="text-blue-800 font-medium mt-2">Points to award: {getSelectedTask()?.points}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center space-x-2 mb-3">
                  <input
                    type="radio"
                    name="pointsType"
                    checked={useCustomPoints}
                    onChange={() => setUseCustomPoints(true)}
                    className="text-blue-600"
                  />
                  <span className="font-medium text-gray-900">Award custom points</span>
                </label>
                
                {useCustomPoints && (
                  <div className="ml-6">
                    <label htmlFor="customPoints" className="block text-sm font-medium text-gray-700 mb-2">
                      Enter Points Amount
                    </label>
                    <input
                      type="number"
                      id="customPoints"
                      value={customPoints}
                      onChange={(e) => setCustomPoints(e.target.value)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter number of points..."
                      required={useCustomPoints}
                    />
                  </div>
                )}
              </div>

              {(selectedTaskId || (useCustomPoints && customPoints)) && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Summary</h4>
                  <p className="text-sm text-green-800">
                    <span className="font-medium">{member.userName}</span> will receive{' '}
                    <span className="font-bold">{getPointsToAward()} points</span>
                    {!useCustomPoints && selectedTaskId ? (
                      <span> for completing "{getSelectedTask()?.title}"</span>
                    ) : (
                      <span> as a custom award</span>
                    )}
                  </p>
                </div>
              )}
            </>
          )}
        </form>
      </div>
    </Modal>
  )
}

export default AwardPointsModal