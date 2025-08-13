import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getUserGroups, 
  getGroupMembers, 
  getGroupInvitations,
  getPendingJoinRequests,
  createGroup,
  joinGroup,
  inviteUsersToGroup,
  acceptInvitation,
  cancelInvitation,
  resendInvitation,
  approveJoinRequest,
  rejectJoinRequest
} from '@/lib/groups'
import { Group, GroupMember, GroupInvitation, GroupJoinRequest, CreateGroupData } from '@/types'

// Query Keys
export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: (userId: string) => [...groupKeys.lists(), userId] as const,
  details: () => [...groupKeys.all, 'detail'] as const,
  detail: (groupId: string) => [...groupKeys.details(), groupId] as const,
  members: (groupId: string) => [...groupKeys.detail(groupId), 'members'] as const,
  invitations: (groupId: string) => [...groupKeys.detail(groupId), 'invitations'] as const,
  joinRequests: (groupId: string) => [...groupKeys.detail(groupId), 'joinRequests'] as const,
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

export const usePendingJoinRequests = (groupId?: string) => {
  return useQuery({
    queryKey: groupKeys.joinRequests(groupId || ''),
    queryFn: () => getPendingJoinRequests(groupId!),
    enabled: !!groupId,
  })
}

// Group Mutations
export const useCreateGroup = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ userId, groupData }: { userId: string; groupData: CreateGroupData }) =>
      createGroup(userId, groupData),
    onSuccess: (_, { userId }) => {
      // Invalidate user groups to refetch
      queryClient.invalidateQueries({ queryKey: groupKeys.list(userId) })
    },
  })
}

export const useJoinGroup = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ userId, groupCode }: { userId: string; groupCode: string }) =>
      joinGroup(userId, groupCode),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list(userId) })
    },
  })
}

export const useInviteUsers = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ groupId, emails, adminId }: { 
      groupId: string; 
      emails: string[]; 
      adminId: string 
    }) => inviteUsersToGroup(groupId, emails, adminId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.invitations(groupId) })
    },
  })
}

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ invitationId, userId }: { invitationId: string; userId: string }) =>
      acceptInvitation(invitationId, userId),
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
      // Invalidate all invitation queries
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail'] })
    },
  })
}

export const useResendInvitation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (invitationId: string) => resendInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail'] })
    },
  })
}

export const useApproveJoinRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ requestId, adminId }: { requestId: string; adminId: string }) =>
      approveJoinRequest(requestId, adminId),
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export const useRejectJoinRequest = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (requestId: string) => rejectJoinRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}