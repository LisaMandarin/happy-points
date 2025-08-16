import { useQueries } from '@tanstack/react-query'
import { groupKeys } from '@/hooks/queries/useGroups'
import { getGroupMembers } from '@/lib/groups'
import { Group } from '@/types'

export interface GroupPointsBreakdown {
  groupId: string
  groupName: string
  currentPoints: number
  totalEarned: number
  totalRedeemed: number
}

export interface UserGroupPointsData {
  groupBreakdown: GroupPointsBreakdown[]
  overallTotals: {
    currentPoints: number
    totalEarned: number
    totalRedeemed: number
  }
  isLoading: boolean
}

export const useUserGroupPointsBreakdown = (userId?: string, groups: Group[] = []): UserGroupPointsData => {
  // Create queries for each group to get the user's member data
  const groupMemberQueries = useQueries({
    queries: groups.map(group => ({
      queryKey: groupKeys.members(group.id),
      queryFn: () => getGroupMembers(group.id),
      enabled: !!userId && !!group.id,
    }))
  })

  // Calculate breakdown and totals
  const isLoading = groupMemberQueries.some(query => query.isLoading)
  
  const groupBreakdown: GroupPointsBreakdown[] = []
  let overallCurrentPoints = 0
  let overallTotalEarned = 0
  let overallTotalRedeemed = 0

  if (!isLoading && userId) {
    groups.forEach((group, index) => {
      const groupMembers = groupMemberQueries[index]?.data || []
      const userMember = groupMembers.find(member => member.userId === userId)
      
      if (userMember) {
        const earned = userMember.pointsEarned || 0
        const redeemed = userMember.pointsRedeemed || 0
        const current = earned - redeemed

        groupBreakdown.push({
          groupId: group.id,
          groupName: group.name,
          currentPoints: current,
          totalEarned: earned,
          totalRedeemed: redeemed
        })

        overallCurrentPoints += current
        overallTotalEarned += earned
        overallTotalRedeemed += redeemed
      }
    })
  }

  return {
    groupBreakdown,
    overallTotals: {
      currentPoints: overallCurrentPoints,
      totalEarned: overallTotalEarned,
      totalRedeemed: overallTotalRedeemed
    },
    isLoading
  }
}