import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getUserTransactions,
  addPointsTransaction
} from '@/lib/firestore'
import { PointsTransaction, CreateTransactionData } from '@/types'

// Query Keys
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (userId: string) => [...transactionKeys.lists(), userId] as const,
}

// Transaction Queries
export const useUserTransactions = (userId?: string, limit = 5) => {
  return useQuery({
    queryKey: [...transactionKeys.list(userId || ''), limit],
    queryFn: () => getUserTransactions(userId!, limit as any),
    enabled: !!userId,
  })
}

// Transaction Mutations
export const useAddTransaction = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (transactionData: CreateTransactionData) => 
      addPointsTransaction(transactionData),
    onSuccess: (_, transactionData) => {
      // Invalidate user transactions and user profile
      queryClient.invalidateQueries({ queryKey: transactionKeys.list(transactionData.userId) })
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}