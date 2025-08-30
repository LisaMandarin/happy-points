import { useQuery } from '@tanstack/react-query'
import { Group } from '@/types'
import { 
  getGroupInvitations
} from '@/lib/groups'
import { getGroupTaskCompletions } from '@/lib/tasks'

export interface PendingItem {
  type: 'admin' | 'user'
  title: string
  description: string
  actionType: 'task-applications' | 'group-invitation' | 'prize-applications'
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
          // Check for pending task applications
          const taskApplications = await getGroupTaskCompletions(group.id)
          const pendingTaskApplications = taskApplications.filter(app => app.status === 'pending')
          
          if (pendingTaskApplications.length > 0) {
            pendingItems.push({
              type: 'admin',
              title: `${pendingTaskApplications.length} Task Application${pendingTaskApplications.length > 1 ? 's' : ''}`,
              description: `Members have applied for tasks in ${group.name}`,
              actionType: 'task-applications',
              groupName: group.name,
              group,
              createdAt: new Date(Math.max(...pendingTaskApplications.map(app => {
                const date = app.completedAt instanceof Date ? app.completedAt : app.completedAt.toDate()
                return date.getTime()
              }))),
              count: pendingTaskApplications.length
            })
          }

          // Check for pending prize redemption applications
          try {
            const { getGroupPrizeRedemptionApplications } = await import('@/lib/firestore')
            const prizeApplications = await getGroupPrizeRedemptionApplications(group.id)
            const pendingPrizeApplications = prizeApplications.filter(app => app.status === 'pending')
            
            if (pendingPrizeApplications.length > 0) {
              pendingItems.push({
                type: 'admin',
                title: `${pendingPrizeApplications.length} Prize Application${pendingPrizeApplications.length > 1 ? 's' : ''}`,
                description: `Members have applied for prize redemptions in ${group.name}`,
                actionType: 'prize-applications',
                groupName: group.name,
                group,
                createdAt: new Date(Math.max(...pendingPrizeApplications.map(app => {
                  let date: Date
                  if (app.createdAt instanceof Date) {
                    date = app.createdAt
                  } else if (app.createdAt && typeof app.createdAt === 'object' && 'toDate' in app.createdAt) {
                    date = (app.createdAt as any).toDate()
                  } else {
                    date = new Date()
                  }
                  return date.getTime()
                }))),
                count: pendingPrizeApplications.length
              })
            }
          } catch (prizeError) {
            console.error(`Error fetching pending prize applications for group ${group.id}:`, prizeError)
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