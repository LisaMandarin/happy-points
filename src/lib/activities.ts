import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'

export type ActivityType = 
  | 'points_earned'
  | 'points_redeemed' 
  | 'group_created'
  | 'group_joined'
  | 'group_left'
  | 'group_invitation_sent'
  | 'group_invitation_received'
  | 'group_invitation_accepted'
  | 'join_request_submitted'
  | 'join_request_approved'
  | 'join_request_rejected'
  | 'task_created'
  | 'task_completed'
  | 'task_application_submitted'
  | 'task_application_approved'
  | 'task_application_rejected'
  | 'member_added'
  | 'member_removed'
  | 'profile_updated'

export interface ActivityData {
  userId: string
  type: ActivityType
  title: string
  description: string
  icon?: string
  data?: any
  groupId?: string
  groupName?: string
  taskId?: string
  taskTitle?: string
  relatedUserId?: string
  relatedUserName?: string
  pointsAmount?: number
}

/**
 * Log an activity for a user
 */
export const logActivity = async (activityData: ActivityData): Promise<string> => {
  try {
    const activitiesRef = collection(db, COLLECTIONS.ACTIVITIES)
    const docRef = await addDoc(activitiesRef, {
      ...activityData,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error logging activity:', error)
    throw new Error('Failed to log activity')
  }
}

/**
 * Get user activities with pagination
 */
export const getUserActivities = async (
  userId: string, 
  limitCount = 20
): Promise<any[]> => {
  try {
    const activitiesRef = collection(db, COLLECTIONS.ACTIVITIES)
    const q = query(
      activitiesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching user activities:', error)
    return []
  }
}

/**
 * Get group activities (activities related to a specific group)
 */
export const getGroupActivities = async (
  groupId: string,
  limitCount = 20
): Promise<any[]> => {
  try {
    const activitiesRef = collection(db, COLLECTIONS.ACTIVITIES)
    const q = query(
      activitiesRef,
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching group activities:', error)
    return []
  }
}

/**
 * Helper functions to create specific activity types
 */
export const Activities = {
  pointsEarned: (userId: string, amount: number, description: string, taskId?: string, taskTitle?: string): ActivityData => ({
    userId,
    type: 'points_earned',
    title: `Earned ${amount} points`,
    description,
    icon: '💰',
    pointsAmount: amount,
    taskId,
    taskTitle,
  }),

  pointsRedeemed: (userId: string, amount: number, description: string): ActivityData => ({
    userId,
    type: 'points_redeemed',
    title: `Redeemed ${amount} points`,
    description,
    icon: '🎁',
    pointsAmount: amount,
  }),

  groupCreated: (userId: string, groupId: string, groupName: string): ActivityData => ({
    userId,
    type: 'group_created',
    title: 'Created a new group',
    description: `Created the group "${groupName}"`,
    icon: '👥',
    groupId,
    groupName,
  }),

  groupJoined: (userId: string, groupId: string, groupName: string): ActivityData => ({
    userId,
    type: 'group_joined',
    title: 'Joined a group',
    description: `Joined the group "${groupName}"`,
    icon: '🤝',
    groupId,
    groupName,
  }),

  groupInvitationSent: (userId: string, groupId: string, groupName: string, inviteeEmail: string): ActivityData => ({
    userId,
    type: 'group_invitation_sent',
    title: 'Sent group invitation',
    description: `Invited ${inviteeEmail} to join "${groupName}"`,
    icon: '📧',
    groupId,
    groupName,
    data: { inviteeEmail },
  }),

  groupInvitationReceived: (userId: string, groupId: string, groupName: string, adminName: string): ActivityData => ({
    userId,
    type: 'group_invitation_received',
    title: 'Received group invitation',
    description: `${adminName} invited you to join "${groupName}"`,
    icon: '📩',
    groupId,
    groupName,
    relatedUserName: adminName,
  }),

  joinRequestSubmitted: (userId: string, groupId: string, groupName: string): ActivityData => ({
    userId,
    type: 'join_request_submitted',
    title: 'Submitted join request',
    description: `Requested to join the group "${groupName}"`,
    icon: '🙋',
    groupId,
    groupName,
  }),

  joinRequestApproved: (userId: string, groupId: string, groupName: string, adminName: string): ActivityData => ({
    userId,
    type: 'join_request_approved',
    title: 'Join request approved',
    description: `${adminName} approved your request to join "${groupName}"`,
    icon: '✅',
    groupId,
    groupName,
    relatedUserName: adminName,
  }),

  taskCreated: (userId: string, groupId: string, groupName: string, taskId: string, taskTitle: string): ActivityData => ({
    userId,
    type: 'task_created',
    title: 'Created a new task',
    description: `Created the task "${taskTitle}" in ${groupName}`,
    icon: '📝',
    groupId,
    groupName,
    taskId,
    taskTitle,
  }),

  taskApplicationSubmitted: (userId: string, groupId: string, groupName: string, taskId: string, taskTitle: string): ActivityData => ({
    userId,
    type: 'task_application_submitted',
    title: 'Applied for task completion',
    description: `Applied for task "${taskTitle}" in ${groupName}`,
    icon: '📋',
    groupId,
    groupName,
    taskId,
    taskTitle,
  }),

  taskApplicationApproved: (userId: string, groupId: string, groupName: string, taskId: string, taskTitle: string, pointsAwarded: number): ActivityData => ({
    userId,
    type: 'task_application_approved',
    title: 'Task completion approved',
    description: `Your completion of "${taskTitle}" was approved and you earned ${pointsAwarded} points`,
    icon: '🎉',
    groupId,
    groupName,
    taskId,
    taskTitle,
    pointsAmount: pointsAwarded,
  }),

  taskApplicationRejected: (userId: string, groupId: string, groupName: string, taskId: string, taskTitle: string, adminName: string, rejectionReason: string): ActivityData => ({
    userId,
    type: 'task_application_rejected',
    title: 'Task completion rejected',
    description: `Your completion of "${taskTitle}" was rejected by ${adminName}. ${rejectionReason}`,
    icon: '❌',
    groupId,
    groupName,
    taskId,
    taskTitle,
    relatedUserName: adminName,
    data: { rejectionReason },
  }),

  profileUpdated: (userId: string, field: string): ActivityData => ({
    userId,
    type: 'profile_updated',
    title: 'Profile updated',
    description: `Updated your ${field}`,
    icon: '⚙️',
    data: { field },
  }),
}

/**
 * Get activity icon and color based on activity type
 */
export const getActivityDisplay = (activity: { type: ActivityType }) => {
  const displays: Record<ActivityType, { icon: string; color: string; bgColor: string }> = {
    points_earned: { icon: '💰', color: 'text-green-600', bgColor: 'bg-green-50' },
    points_redeemed: { icon: '🎁', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    group_created: { icon: '👥', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    group_joined: { icon: '🤝', color: 'text-green-600', bgColor: 'bg-green-50' },
    group_left: { icon: '👋', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    group_invitation_sent: { icon: '📧', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    group_invitation_received: { icon: '📩', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    group_invitation_accepted: { icon: '✅', color: 'text-green-600', bgColor: 'bg-green-50' },
    join_request_submitted: { icon: '🙋', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    join_request_approved: { icon: '✅', color: 'text-green-600', bgColor: 'bg-green-50' },
    join_request_rejected: { icon: '❌', color: 'text-red-600', bgColor: 'bg-red-50' },
    task_created: { icon: '📝', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    task_completed: { icon: '✅', color: 'text-green-600', bgColor: 'bg-green-50' },
    task_application_submitted: { icon: '📋', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    task_application_approved: { icon: '🎉', color: 'text-green-600', bgColor: 'bg-green-50' },
    task_application_rejected: { icon: '❌', color: 'text-red-600', bgColor: 'bg-red-50' },
    member_added: { icon: '👤', color: 'text-green-600', bgColor: 'bg-green-50' },
    member_removed: { icon: '👤', color: 'text-red-600', bgColor: 'bg-red-50' },
    profile_updated: { icon: '⚙️', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  }

  return displays[activity.type] || displays.profile_updated
}