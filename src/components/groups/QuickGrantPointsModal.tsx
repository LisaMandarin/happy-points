'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Alert, LoadingSpinner } from '@/components/ui'
import { Group, GroupMember, GroupTask } from '@/types'
import { getGroupMembers } from '@/lib/groups'
import { getActiveGroupTasks } from '@/lib/tasks'

interface QuickGrantPointsModalProps {
  isOpen: boolean
  onClose: () => void
  adminGroups: Group[]
  currentUserId: string
  onAwardPoints: (memberId: string, taskId: string, points: number, groupId?: string) => Promise<void>
}

const QuickGrantPointsModal: React.FC<QuickGrantPointsModalProps> = ({
  isOpen,
  onClose,
  adminGroups,
  currentUserId,
  onAwardPoints
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [members, setMembers] = useState<GroupMember[]>([])
  const [tasks, setTasks] = useState<GroupTask[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [customPoints, setCustomPoints] = useState<string>('')
  const [useCustomPoints, setUseCustomPoints] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupData(selectedGroupId)
    } else {
      setMembers([])
      setTasks([])
      setSelectedMemberId('')
      setSelectedTaskId('')
    }
  }, [selectedGroupId])

  const resetForm = () => {
    setSelectedGroupId('')
    setMembers([])
    setTasks([])
    setSelectedMemberId('')
    setSelectedTaskId('')
    setCustomPoints('')
    setUseCustomPoints(false)
    setError(null)
    setSuccessMessage(null)
  }

  const loadGroupData = async (groupId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Load members and tasks in parallel
      const [membersPromise, tasksPromise] = await Promise.allSettled([
        loadMembers(groupId),
        loadTasks(groupId)
      ])

      if (membersPromise.status === 'rejected') {
        console.error('Error loading members:', membersPromise.reason)
      }
      
      if (tasksPromise.status === 'rejected') {
        console.error('Error loading tasks:', tasksPromise.reason)
      }
      
    } catch (error) {
      console.error('Error loading group data:', error)
      setError('Failed to load group data')
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (groupId: string) => {
    try {
      setLoadingMembers(true)
      const groupMembers = await getGroupMembers(groupId)
      // Filter out admin (current user) and inactive members
      const activeNonAdminMembers = groupMembers.filter(
        member => member.userId !== currentUserId && member.isActive !== false
      )
      setMembers(activeNonAdminMembers)
    } catch (error) {
      console.error('Error loading members:', error)
      throw error
    } finally {
      setLoadingMembers(false)
    }
  }

  const loadTasks = async (groupId: string) => {
    try {
      setLoadingTasks(true)
      const groupTasks = await getActiveGroupTasks(groupId)
      setTasks(groupTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
      throw error
    } finally {
      setLoadingTasks(false)
    }
  }

  const getSelectedTask = () => {
    return tasks.find(task => task.id === selectedTaskId)
  }

  const getPointsToAward = () => {
    if (useCustomPoints) {
      return parseInt(customPoints) || 0
    }
    const selectedTask = getSelectedTask()
    return selectedTask ? selectedTask.points : 0
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedGroupId) {
      setError('Please select a group')
      return
    }

    if (!selectedMemberId) {
      setError('Please select a member to award points to')
      return
    }

    if (!selectedTaskId && !useCustomPoints) {
      setError('Please select a task or use custom points')
      return
    }

    if (useCustomPoints && (!customPoints || parseInt(customPoints) <= 0)) {
      setError('Please enter a valid number of custom points')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccessMessage(null)
      
      const pointsToAward = getPointsToAward()
      await onAwardPoints(selectedMemberId, selectedTaskId || 'custom', pointsToAward, selectedGroupId)
      
      setSuccessMessage('Points awarded successfully!')
      
      // Close modal after 2 seconds
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error) {
      console.error('Error awarding points:', error)
      setError(error instanceof Error ? error.message : 'Failed to award points')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedTask = getSelectedTask()

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Grant Points to Group Member"
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
            form="quick-grant-points-form"
            disabled={submitting || loading}
          >
            {submitting ? <LoadingSpinner size="sm" /> : 'Grant Points'}
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

        {adminGroups.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M9 20H4v-2a3 3 0 015.196-2.121m8.264-6.394a3 3 0 11-4.472 4.472M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">You're not an admin of any groups</p>
            <p className="text-sm text-gray-400">Create a group or be promoted to admin to grant points</p>
          </div>
        ) : (
          <form id="quick-grant-points-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2">
                Select Group (You Admin)
              </label>
              <select
                id="group"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Choose a group...</option>
                {adminGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.memberCount} members)
                  </option>
                ))}
              </select>
            </div>

            {selectedGroupId && (
              <div>
                <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Member
                </label>
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2 text-gray-600">Loading members...</span>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-md">
                    No active members available in this group
                  </div>
                ) : (
                  <select
                    id="member"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Choose a member...</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.userId}>
                        {member.userName} ({(member.pointsEarned || 0) - (member.pointsRedeemed || 0)} points)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {selectedMemberId && (
              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={useCustomPoints}
                      onChange={(e) => setUseCustomPoints(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="text-sm font-medium text-gray-700">Use custom points (not based on task)</span>
                  </label>
                </div>

                {useCustomPoints ? (
                  <div>
                    <label htmlFor="customPoints" className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Points
                    </label>
                    <input
                      type="number"
                      id="customPoints"
                      value={customPoints}
                      onChange={(e) => setCustomPoints(e.target.value)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter points to award"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Task (determines points)
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

                {((selectedTask && !useCustomPoints) || (useCustomPoints && customPoints)) && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Grant Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-blue-800">Member:</span>
                        <p className="text-blue-700">{members.find(m => m.userId === selectedMemberId)?.userName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-blue-800">Points to Award:</span>
                        <p className="text-blue-700 font-semibold">{getPointsToAward()} points</p>
                      </div>
                      {selectedTask && !useCustomPoints && (
                        <div>
                          <span className="font-medium text-blue-800">For Task:</span>
                          <p className="text-blue-700">{selectedTask.title}</p>
                        </div>
                      )}
                      {useCustomPoints && (
                        <div>
                          <span className="font-medium text-blue-800">Reason:</span>
                          <p className="text-blue-700">Custom point award (manual)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </Modal>
  )
}

export default QuickGrantPointsModal