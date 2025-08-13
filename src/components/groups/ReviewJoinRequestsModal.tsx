'use client'

import React from 'react'
import { Modal, Button, Alert, LoadingSpinner } from '@/components/ui'
import { GroupJoinRequest } from '@/types'
import { getPendingJoinRequests, approveJoinRequest, rejectJoinRequest } from '@/lib/groups'
import { formatDate } from '@/lib/utils'
import { getApplicationStatusBadge } from '@/lib/utils/statusBadges'
import { useModalData } from '@/hooks/useModalData'
import { useApproveReject } from '@/hooks/useApproveReject'

interface ReviewJoinRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  adminId: string
  adminName: string
  onRequestProcessed: () => void
}

const ReviewJoinRequestsModal: React.FC<ReviewJoinRequestsModalProps> = ({
  isOpen,
  onClose,
  adminId,
  adminName,
  onRequestProcessed
}) => {
  const { data: joinRequests, loading, error: dataError, reload } = useModalData<GroupJoinRequest[]>({
    loadDataFn: () => getPendingJoinRequests(adminId),
    dependencies: [isOpen, adminId],
    errorMessage: 'Failed to load join requests'
  })

  const {
    handleApprove,
    handleReject,
    processing,
    error: processError,
    successMessage
  } = useApproveReject({
    approveAction: approveJoinRequest,
    rejectAction: rejectJoinRequest,
    onProcessed: onRequestProcessed,
    refreshData: reload,
    approveSuccessMessage: 'Join request approved successfully!',
    rejectSuccessMessage: 'Join request rejected.',
    approveErrorMessage: 'Failed to approve join request',
    rejectErrorMessage: 'Failed to reject join request'
  })

  const error = dataError || processError

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Join Requests"
      size="lg"
      footer={
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {joinRequests?.length || 0} pending join requests
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
            <span className="ml-2 text-gray-600">Loading join requests...</span>
          </div>
        ) : !joinRequests || joinRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500">No pending join requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {joinRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h5 className="font-medium text-gray-900">
                        {request.userName}
                      </h5>
                      {getApplicationStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p><span className="font-medium">Email:</span> {request.userEmail}</p>
                      <p><span className="font-medium">Group:</span> {request.groupName}</p>
                      <p><span className="font-medium">Requested:</span> {formatDate(request.requestedAt)}</p>
                    </div>
                  </div>
                </div>
                
                {request.status === 'pending' && (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request.id, adminId, adminName)}
                      disabled={processing === request.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processing === request.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        'Approve'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(request.id, adminId, adminName, 'Request declined by admin')}
                      disabled={processing === request.id}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      {processing === request.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        'Reject'
                      )}
                    </Button>
                  </div>
                )}

                {request.status !== 'pending' && (
                  <div className="text-sm text-gray-500 mt-2 space-y-1">
                    {request.processedAt && (
                      <p><span className="font-medium">Processed:</span> {formatDate(request.processedAt)}</p>
                    )}
                    {request.processedByName && (
                      <p><span className="font-medium">By:</span> {request.processedByName}</p>
                    )}
                    {request.rejectionReason && (
                      <p><span className="font-medium">Reason:</span> {request.rejectionReason}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ReviewJoinRequestsModal