import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getGroupTasks,
  getActiveGroupTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  getTaskCompletion,
  getGroupTaskCompletions,
  approveTaskCompletion,
  rejectTaskCompletion,
  getPendingTaskApplications,
  getAdminTaskStats
} from '@/lib/tasks'
import { GroupTask, TaskCompletion, CreateTaskData, UpdateTaskData } from '@/types'

// Query Keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (groupId: string) => [...taskKeys.lists(), groupId] as const,
  active: (groupId: string) => [...taskKeys.lists(), groupId, 'active'] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
  completions: (groupId: string) => [...taskKeys.all, 'completions', groupId] as const,
  completion: (completionId: string) => [...taskKeys.all, 'completion', completionId] as const,
  applications: (groupId: string) => [...taskKeys.all, 'applications', groupId] as const,
  stats: (groupId: string) => [...taskKeys.all, 'stats', groupId] as const,
}

// Task Queries
export const useGroupTasks = (groupId?: string) => {
  return useQuery({
    queryKey: taskKeys.list(groupId || ''),
    queryFn: () => getGroupTasks(groupId!),
    enabled: !!groupId,
  })
}

export const useActiveGroupTasks = (groupId?: string) => {
  return useQuery({
    queryKey: taskKeys.active(groupId || ''),
    queryFn: () => getActiveGroupTasks(groupId!),
    enabled: !!groupId,
  })
}

export const useTask = (taskId?: string) => {
  return useQuery({
    queryKey: taskKeys.detail(taskId || ''),
    queryFn: () => getTask(taskId!),
    enabled: !!taskId,
  })
}

export const useTaskCompletion = (completionId?: string) => {
  return useQuery({
    queryKey: taskKeys.completion(completionId || ''),
    queryFn: () => getTaskCompletion(completionId!),
    enabled: !!completionId,
  })
}

export const useGroupTaskCompletions = (groupId?: string) => {
  return useQuery({
    queryKey: taskKeys.completions(groupId || ''),
    queryFn: () => getGroupTaskCompletions(groupId!),
    enabled: !!groupId,
  })
}

export const usePendingTaskApplications = (groupId?: string) => {
  return useQuery({
    queryKey: taskKeys.applications(groupId || ''),
    queryFn: () => getPendingTaskApplications(groupId!),
    enabled: !!groupId,
  })
}

export const useAdminTaskStats = (groupId?: string) => {
  return useQuery({
    queryKey: taskKeys.stats(groupId || ''),
    queryFn: () => getAdminTaskStats(groupId!),
    enabled: !!groupId,
  })
}

// Task Mutations
export const useCreateTask = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ groupId, taskData, adminId }: { 
      groupId: string; 
      taskData: CreateTaskData; 
      adminId: string 
    }) => createTask(groupId, taskData, adminId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(groupId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.active(groupId) })
    },
  })
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: UpdateTaskData }) =>
      updateTask(taskId, updates),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

export const useCompleteTask = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ taskId, userId, note }: { 
      taskId: string; 
      userId: string; 
      note?: string 
    }) => completeTask(taskId, userId, note),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.completions() })
      queryClient.invalidateQueries({ queryKey: taskKeys.applications() })
    },
  })
}

export const useApproveTaskCompletion = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ completionId, adminId }: { completionId: string; adminId: string }) =>
      approveTaskCompletion(completionId, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.completions() })
      queryClient.invalidateQueries({ queryKey: taskKeys.applications() })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export const useRejectTaskCompletion = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ completionId, adminId, reason }: { 
      completionId: string; 
      adminId: string; 
      reason?: string 
    }) => rejectTaskCompletion(completionId, adminId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.completions() })
      queryClient.invalidateQueries({ queryKey: taskKeys.applications() })
    },
  })
}