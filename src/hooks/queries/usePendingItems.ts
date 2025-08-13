import { useQuery } from '@tanstack/react-query'
import { Group } from '@/types'
import { 
  getPendingJoinRequests,
  getGroupInvitations
} from '@/lib/groups'
import { getGroupTaskCompletions } from '@/lib/tasks'

export interface PendingItem {
  type: 'admin' | 'user'
  title: string
  description: string
  actionType: 'join-requests' | 'task-applications' | 'group-invitation'
  groupName?: string
  group?: Group
  createdAt: Date
  invitationCode?: string
  count?: number
}

export function useUserPendingItems(userId?: string, groups: Group[] = []) {
  return useQuery({
    queryKey: ['pendingItems', userId, groups.map(g => g.id)],
    queryFn: async (): Promise<PendingItem[]> => {
      if (!userId) return []

      const pendingItems: PendingItem[] = []
      const adminGroups = groups.filter(group => group.adminId === userId)
      
      // Admin pending items (for groups user is admin of)
      for (const group of adminGroups) {
        try {
          // Check for pending join requests
          const joinRequests = await getPendingJoinRequests(userId)
          const groupJoinRequests = joinRequests.filter(req => req.groupId === group.id && req.status === 'pending')
          
          if (groupJoinRequests.length > 0) {
            pendingItems.push({
              type: 'admin',
              title: `${groupJoinRequests.length} Join Request${groupJoinRequests.length > 1 ? 's' : ''}`,
              description: `New members want to join ${group.name}`,
              actionType: 'join-requests',
              groupName: group.name,
              group,
              createdAt: new Date(Math.max(...groupJoinRequests.map(req => {
                const date = req.requestedAt instanceof Date ? req.requestedAt : req.requestedAt.toDate()
                return date.getTime()
              }))),
              count: groupJoinRequests.length
            })
          }

          // Check for pending task applications
          const taskApplications = await getGroupTaskCompletions(group.id)
          const pendingApplications = taskApplications.filter(app => app.status === 'pending')
          
          if (pendingApplications.length > 0) {
            pendingItems.push({
              type: 'admin',
              title: `${pendingApplications.length} Task Application${pendingApplications.length > 1 ? 's' : ''}`,
              description: `Members have applied for tasks in ${group.name}`,
              actionType: 'task-applications',
              groupName: group.name,
              group,
              createdAt: new Date(Math.max(...pendingApplications.map(app => {
                const date = app.completedAt instanceof Date ? app.completedAt : app.completedAt.toDate()
                return date.getTime()
              }))),
              count: pendingApplications.length
            })
          }
        } catch (error) {
          console.error(`Error fetching pending items for group ${group.id}:`, error)
        }
      }

      // User pending items (invitations to join groups)
      // TODO: Implement getUserInvitations function to get pending invitations for current user
      // For now, we'll focus on admin actions which are more critical

      // Sort by creation date (newest first)
      return pendingItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds to keep data fresh
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}