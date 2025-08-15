import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getUserGroups, 
  getGroupMembers, 
  getGroupInvitations,
  getGroupInvitationCount,
  createGroup,
  sendGroupInvitations,
  acceptInvitation,
  cancelInvitation,
  resendInvitation
} from '@/lib/groups'
import { awardPointsToMember } from '@/lib/tasks'
import { createGroupPenalty, getGroupPenalties, createGroupPenaltyType, getGroupPenaltyTypes, deleteGroupPenaltyType, updateGroupPenaltyType } from '@/lib/firestore'
import { Group, GroupMember, GroupInvitation, CreateGroupData, UpdatePenaltyTypeData } from '@/types'
import { useAuthStore } from '@/stores/authStore'

// Query Keys
export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: (userId: string) => [...groupKeys.lists(), userId] as const,
  details: () => [...groupKeys.all, 'detail'] as const,
  detail: (groupId: string) => [...groupKeys.details(), groupId] as const,
  members: (groupId: string) => [...groupKeys.detail(groupId), 'members'] as const,
  invitations: (groupId: string) => [...groupKeys.detail(groupId), 'invitations'] as const,
  invitationCount: (groupId: string) => [...groupKeys.detail(groupId), 'invitationCount'] as const,
  penalties: (groupId: string) => [...groupKeys.detail(groupId), 'penalties'] as const,
  penaltyTypes: (groupId: string) => [...groupKeys.detail(groupId), 'penaltyTypes'] as const,
}

// Groups Queries
export const useUserGroups = (userId?: string) => {
  return useQuery({
    queryKey: groupKeys.list(userId || ''),
    queryFn: () => getUserGroups(userId!),
    enabled: !!userId,
  })
}

export const useGroupMembers = (groupId?: string) => {
  return useQuery({
    queryKey: groupKeys.members(groupId || ''),
    queryFn: () => getGroupMembers(groupId!),
    enabled: !!groupId,
  })
}

export const useGroupInvitations = (groupId?: string) => {
  return useQuery({
    queryKey: groupKeys.invitations(groupId || ''),
    queryFn: () => getGroupInvitations(groupId!),
    enabled: !!groupId,
  })
}

export const useGroupInvitationCount = (groupId?: string) => {
  return useQuery({
    queryKey: groupKeys.invitationCount(groupId || ''),
    queryFn: () => getGroupInvitationCount(groupId!),
    enabled: !!groupId,
  })
}

export const useGroupPenalties = (groupId?: string) => {
  return useQuery({
    queryKey: groupKeys.penalties(groupId || ''),
    queryFn: () => getGroupPenalties(groupId!),
    enabled: !!groupId,
  })
}

export const useGroupPenaltyTypes = (groupId?: string) => {
  return useQuery({
    queryKey: groupKeys.penaltyTypes(groupId || ''),
    queryFn: () => getGroupPenaltyTypes(groupId!),
    enabled: !!groupId,
  })
}


// Group Mutations
export const useCreateGroup = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ userId, userProfile, groupData }: { userId: string; userProfile: any; groupData: CreateGroupData }) =>
      createGroup(userId, userProfile.name, groupData),
    onSuccess: (_, { userId }) => {
      // Invalidate user groups to refetch
      queryClient.invalidateQueries({ queryKey: groupKeys.list(userId) })
    },
  })
}


export const useInviteUsers = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ groupId, emails, adminId, adminName, groupName }: { 
      groupId: string; 
      emails: string[]; 
      adminId: string;
      adminName: string;
      groupName: string;
    }) => sendGroupInvitations({ groupId, emails, adminId }, adminName, groupName),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.invitations(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.invitationCount(groupId) })
    },
  })
}

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ invitationId, userId, userName, userEmail }: { 
      invitationId: string; 
      userId: string;
      userName: string;
      userEmail: string;
    }) => acceptInvitation(invitationId, userId, userName, userEmail),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list(userId) })
    },
  })
}

export const useCancelInvitation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (invitationId: string) => cancelInvitation(invitationId),
    onSuccess: () => {
      // Invalidate all invitation queries including counts
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail'] })
    },
  })
}

export const useResendInvitation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ invitationId, groupId, groupName, adminId, adminName, inviteeEmail }: {
      invitationId: string;
      groupId: string;
      groupName: string;
      adminId: string;
      adminName: string;
      inviteeEmail: string;
    }) => resendInvitation(invitationId, groupId, groupName, adminId, adminName, inviteeEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail'] })
    },
  })
}


export const useAwardPoints = () => {
  const queryClient = useQueryClient()
  const { refreshProfile } = useAuthStore()
  
  return useMutation({
    mutationFn: ({ 
      groupId, 
      memberId, 
      adminId, 
      adminName, 
      points, 
      taskId, 
      taskTitle 
    }: {
      groupId: string;
      memberId: string;
      adminId: string;
      adminName: string;
      points: number;
      taskId?: string;
      taskTitle?: string;
    }) => awardPointsToMember(groupId, memberId, adminId, adminName, points, taskId, taskTitle),
    onSuccess: (_, { groupId, memberId, adminId }) => {
      // Invalidate group-related queries
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.list(adminId) })
      
      // Invalidate transaction queries for the member
      queryClient.invalidateQueries({ queryKey: ['transactions', memberId] })
      
      // Refresh the member's profile in auth store if they're the current user
      const currentUser = useAuthStore.getState().user
      if (currentUser && currentUser.uid === memberId) {
        refreshProfile(memberId)
      }
      
      // Invalidate all group queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export const usePenalizeMember = () => {
  const queryClient = useQueryClient()
  const { refreshProfile } = useAuthStore()
  
  return useMutation({
    mutationFn: ({ 
      groupId, 
      groupName, 
      adminId, 
      adminName, 
      memberId, 
      memberName, 
      title,
      description,
      amount 
    }: {
      groupId: string;
      groupName: string;
      adminId: string;
      adminName: string;
      memberId: string;
      memberName: string;
      title: string;
      description: string;
      amount: number;
    }) => createGroupPenalty({
      groupId,
      groupName,
      adminId,
      adminName,
      memberId,
      memberName,
      title,
      description,
      amount
    }),
    onSuccess: (_, { groupId, memberId, adminId }) => {
      // Invalidate group-related queries
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.list(adminId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.penalties(groupId) })
      
      // Invalidate transaction queries for the member
      queryClient.invalidateQueries({ queryKey: ['transactions', memberId] })
      
      // Refresh the member's profile in auth store if they're the current user
      const currentUser = useAuthStore.getState().user
      if (currentUser && currentUser.uid === memberId) {
        refreshProfile(memberId)
      }
      
      // Invalidate all group queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export const useCreatePenaltyType = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      groupId, 
      groupName, 
      title, 
      description, 
      amount, 
      createdBy, 
      createdByName 
    }: {
      groupId: string;
      groupName: string;
      title: string;
      description: string;
      amount: number;
      createdBy: string;
      createdByName: string;
    }) => createGroupPenaltyType({
      groupId,
      groupName,
      title,
      description,
      amount,
      createdBy,
      createdByName
    }),
    onSuccess: (_, { groupId }) => {
      // Invalidate penalty types to refetch
      queryClient.invalidateQueries({ queryKey: groupKeys.penaltyTypes(groupId) })
    },
  })
}

export const useDeletePenaltyType = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ penaltyTypeId, groupId }: { penaltyTypeId: string; groupId: string }) => deleteGroupPenaltyType(penaltyTypeId),
    onSuccess: (_, { groupId }) => {
      // Invalidate penalty types to refetch
      queryClient.invalidateQueries({ queryKey: groupKeys.penaltyTypes(groupId) })
    },
  })
}

export const useUpdatePenaltyType = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ penaltyTypeId, groupId, updateData }: { 
      penaltyTypeId: string; 
      groupId: string; 
      updateData: UpdatePenaltyTypeData 
    }) => updateGroupPenaltyType(penaltyTypeId, updateData),
    onSuccess: (_, { groupId }) => {
      // Invalidate penalty types to refetch
      queryClient.invalidateQueries({ queryKey: groupKeys.penaltyTypes(groupId) })
    },
  })
}