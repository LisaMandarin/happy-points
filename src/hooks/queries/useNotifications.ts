import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getUserNotifications,
  markNotificationAsRead,
  getUnreadNotificationsCount
} from '@/lib/firestore'

// Query Keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (userId: string) => [...notificationKeys.lists(), userId] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unreadCount', userId] as const,
}

// Notification Queries
export const useUserNotifications = (userId?: string, limit?: number) => {
  return useQuery({
    queryKey: [...notificationKeys.list(userId || ''), limit],
    queryFn: () => getUserNotifications(userId!, limit),
    enabled: !!userId,
  })
}

export const useUnreadNotificationsCount = (userId?: string) => {
  return useQuery({
    queryKey: notificationKeys.unreadCount(userId || ''),
    queryFn: () => getUnreadNotificationsCount(userId!),
    enabled: !!userId,
    // Refetch more frequently for notification count
    refetchInterval: 30000, // 30 seconds
  })
}

// Notification Mutations
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: (_, notificationId) => {
      // Invalidate notifications lists and unread count
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] })
    },
  })
}