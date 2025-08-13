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
export const useUserTransactions = (userId?: string, limit?: number) => {
  return useQuery({
    queryKey: [...transactionKeys.list(userId || ''), limit],
    queryFn: () => getUserTransactions(userId!, limit),
    enabled: !!userId,
  })
}

// Transaction Mutations
export const useAddTransaction = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ userId, transactionData }: { 
      userId: string; 
      transactionData: CreateTransactionData 
    }) => addPointsTransaction(userId, transactionData),
    onSuccess: (_, { userId }) => {
      // Invalidate user transactions and user profile
      queryClient.invalidateQueries({ queryKey: transactionKeys.list(userId) })
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}