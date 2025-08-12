'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Alert, LoadingSpinner, Badge } from '@/components/ui'
import { Group, TaskCompletion, GroupTask } from '@/types'
import { getGroupTaskCompletions, approveTaskCompletion, rejectTaskCompletion, getTask } from '@/lib/tasks'
import { formatDate } from '@/lib/utils'

interface TaskApplicationsModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  adminId: string
  adminName: string
  onApplicationProcessed: () => void
}

interface TaskCompletionWithTask extends TaskCompletion {
  taskTitle?: string
  taskDescription?: string
}

const TaskApplicationsModal: React.FC<TaskApplicationsModalProps> = ({
  isOpen,
  onClose,
  group,
  adminId,
  adminName,
  onApplicationProcessed
}) => {
  const [applications, setApplications] = useState<TaskCompletionWithTask[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadApplications()
    }
  }, [isOpen, group.id])

  const loadApplications = async () => {
    try {
      setLoading(true)
      setError(null)
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
      
      setApplications(completionsWithTasks)
    } catch (error) {
      console.error('Error loading applications:', error)
      setError('Failed to load task applications')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (completionId: string) => {
    try {
      setProcessing(completionId)
      setError(null)
      setSuccessMessage(null)
      
      await approveTaskCompletion(completionId, adminId, adminName)
      
      setSuccessMessage('Task application approved successfully!')
      onApplicationProcessed()
      await loadApplications() // Refresh the list
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to approve application')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (completionId: string, reason?: string) => {
    try {
      setProcessing(completionId)
      setError(null)
      setSuccessMessage(null)
      
      await rejectTaskCompletion(completionId, adminId, adminName, reason)
      
      setSuccessMessage('Task application rejected.')
      onApplicationProcessed()
      await loadApplications() // Refresh the list
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reject application')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" size="sm">Pending</Badge>
      case 'approved':
        return <Badge variant="success" size="sm">Approved</Badge>
      case 'rejected':
        return <Badge variant="error" size="sm">Rejected</Badge>
      default:
        return <Badge variant="default" size="sm">{status}</Badge>
    }
  }

  const pendingApplications = applications.filter(app => app.status === 'pending')
  const processedApplications = applications.filter(app => app.status !== 'pending')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Task Applications - ${group.name}`}
      size="lg"
      footer={
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {pendingApplications.length} pending, {processedApplications.length} processed
          </span>
          <Button onClick={onClose}>
            Close
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
            <span className="ml-2 text-gray-600">Loading applications...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">No task applications found</p>
          </div>
        ) : (
          <>
            {/* Pending Applications */}
            {pendingApplications.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  Pending Applications ({pendingApplications.length})
                </h4>
                <div className="space-y-3">
                  {pendingApplications.map((application) => (
                    <div key={application.id} className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="font-medium text-gray-900">
                              {application.taskTitle}
                            </h5>
                            {getStatusBadge(application.status)}
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
                          size="sm"
                          onClick={() => handleApprove(application.id)}
                          disabled={processing === application.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processing === application.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            'Approve'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(application.id, 'Declined by admin')}
                          disabled={processing === application.id}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          {processing === application.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            'Reject'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processed Applications */}
            {processedApplications.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  Processed Applications ({processedApplications.length})
                </h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {processedApplications.map((application) => (
                    <div key={application.id} className={`border rounded-lg p-4 ${
                      application.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="font-medium text-gray-900">
                              {application.taskTitle}
                            </h5>
                            {getStatusBadge(application.status)}
                          </div>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p><span className="font-medium">Applicant:</span> {application.userName}</p>
                            <p><span className="font-medium">Points:</span> {application.pointsAwarded}</p>
                            <p><span className="font-medium">Applied:</span> {formatDate(application.completedAt)}</p>
                            {application.approvedAt && (
                              <p><span className="font-medium">Processed:</span> {formatDate(application.approvedAt)}</p>
                            )}
                            {application.approvedByName && (
                              <p><span className="font-medium">By:</span> {application.approvedByName}</p>
                            )}
                            {application.rejectionReason && (
                              <p><span className="font-medium">Reason:</span> {application.rejectionReason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

export default TaskApplicationsModal