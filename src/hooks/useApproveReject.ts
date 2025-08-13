import { useState } from 'react'

interface UseApproveRejectOptions {
  approveAction: (id: string, adminId: string, adminName: string) => Promise<void>
  rejectAction: (id: string, adminId: string, adminName: string, reason?: string) => Promise<void>
  onProcessed: () => void
  refreshData: () => Promise<void>
  approveSuccessMessage?: string
  rejectSuccessMessage?: string
  approveErrorMessage?: string
  rejectErrorMessage?: string
}

export const useApproveReject = ({
  approveAction,
  rejectAction,
  onProcessed,
  refreshData,
  approveSuccessMessage = 'Approved successfully!',
  rejectSuccessMessage = 'Rejected successfully.',
  approveErrorMessage = 'Failed to approve',
  rejectErrorMessage = 'Failed to reject'
}: UseApproveRejectOptions) => {
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleApprove = async (id: string, adminId: string, adminName: string) => {
    try {
      setApprovingId(id)
      setError(null)
      setSuccessMessage(null)
      
      await approveAction(id, adminId, adminName)
      
      setSuccessMessage(approveSuccessMessage)
      onProcessed()
      await refreshData()
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : approveErrorMessage)
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async (id: string, adminId: string, adminName: string, reason?: string) => {
    try {
      setRejectingId(id)
      setError(null)
      setSuccessMessage(null)
      
      await rejectAction(id, adminId, adminName, reason)
      
      setSuccessMessage(rejectSuccessMessage)
      onProcessed()
      await refreshData()
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : rejectErrorMessage)
    } finally {
      setRejectingId(null)
    }
  }

  return {
    handleApprove,
    handleReject,
    approvingId,
    rejectingId,
    error,
    successMessage
  }
}