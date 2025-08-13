import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  serverTimestamp,
  increment,
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  Group,
  GroupMember,
  GroupInvitation,
  GroupJoinRequest,
  CreateGroupData,
  JoinGroupData,
  InviteToGroupData,
  GroupRole,
  InvitationStatus,
  JoinRequestStatus,
} from '@/types'
import { 
  COLLECTIONS, 
  DEFAULT_VALUES, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} from '@/lib/constants'
import { getUserByEmail, createUserNotification } from '@/lib/firestore'
import { logActivity, Activities } from '@/lib/activities'

// Utility functions
const generateGroupCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < DEFAULT_VALUES.GROUP.CODE_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const generateInvitationCode = (): string => {
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36)
}

// Group operations
/**
 * Create a new group
 */
export const createGroup = async (
  adminId: string,
  adminName: string,
  groupData: CreateGroupData
): Promise<string> => {
  try {
    let groupCode = generateGroupCode()
    let codeExists = true
    
    // Ensure unique group code
    while (codeExists) {
      const existingGroup = await getGroupByCode(groupCode)
      if (!existingGroup) {
        codeExists = false
      } else {
        groupCode = generateGroupCode()
      }
    }

    const groupsRef = collection(db, COLLECTIONS.GROUPS)
    const timestamp = serverTimestamp()
    
    const group = {
      ...groupData,
      code: groupCode,
      adminId,
      adminName,
      memberCount: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const docRef = await addDoc(groupsRef, group)
    
    // Add admin as first member
    await addGroupMember(docRef.id, adminId, adminName, '', 'admin')
    
    // Log activity
    try {
      await logActivity(Activities.groupCreated(adminId, docRef.id, groupData.name))
    } catch (error) {
      console.error('Error logging group creation activity:', error)
    }
    
    return docRef.id
  } catch (error) {
    console.error('Error creating group:', error)
    throw new Error(ERROR_MESSAGES.GROUP.CREATE_FAILED)
  }
}

/**
 * Get group by ID
 */
export const getGroup = async (groupId: string): Promise<Group | null> => {
  try {
    const groupRef = doc(db, COLLECTIONS.GROUPS, groupId)
    const groupSnap = await getDoc(groupRef)
    
    if (groupSnap.exists()) {
      return { id: groupSnap.id, ...groupSnap.data() } as Group
    }
    return null
  } catch (error) {
    console.error('Error fetching group:', error)
    return null
  }
}

/**
 * Get group by code
 */
export const getGroupByCode = async (code: string): Promise<Group | null> => {
  try {
    const groupsRef = collection(db, COLLECTIONS.GROUPS)
    const q = query(groupsRef, where('code', '==', code), limit(1))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return { id: doc.id, ...doc.data() } as Group
    }
    return null
  } catch (error) {
    console.error('Error fetching group by code:', error)
    return null
  }
}

/**
 * Get user's groups
 */
export const getUserGroups = async (userId: string): Promise<Group[]> => {
  try {
    const membersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
    const q = query(membersRef, where('userId', '==', userId))
    const memberSnapshot = await getDocs(q)
    
    const groupIds = memberSnapshot.docs.map(doc => doc.data().groupId)
    
    if (groupIds.length === 0) {
      return []
    }

    const groups: Group[] = []
    for (const groupId of groupIds) {
      const group = await getGroup(groupId)
      if (group) {
        groups.push(group)
      }
    }
    
    return groups.sort((a, b) => {
      const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : a.updatedAt.toDate().getTime()
      const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : b.updatedAt.toDate().getTime()
      return bTime - aTime
    })
  } catch (error) {
    console.error('Error fetching user groups:', error)
    return []
  }
}

/**
 * Join group by code (now creates a join request for admin approval)
 */
export const joinGroupByCode = async (
  userId: string,
  userName: string,
  userEmail: string,
  groupCode: string
): Promise<void> => {
  try {
    // Use the new join request system instead of immediate membership
    await submitJoinRequest(userId, userName, userEmail, groupCode)
  } catch (error) {
    console.error('Error joining group:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error(ERROR_MESSAGES.GROUP.JOIN_FAILED)
  }
}

/**
 * Add group member
 */
export const addGroupMember = async (
  groupId: string,
  userId: string,
  userName: string,
  userEmail: string,
  role: GroupRole = 'member'
): Promise<string> => {
  try {
    const membersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
    const memberData = {
      groupId,
      userId,
      userName,
      userEmail,
      role,
      joinedAt: serverTimestamp(),
      pointsEarned: 0,
      pointsRedeemed: 0,
    }
    
    const docRef = await addDoc(membersRef, memberData)
    return docRef.id
  } catch (error) {
    console.error('Error adding group member:', error)
    throw new Error('Failed to add group member')
  }
}

/**
 * Get group member
 */
export const getGroupMember = async (
  groupId: string,
  userId: string
): Promise<GroupMember | null> => {
  try {
    const membersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
    const q = query(
      membersRef,
      where('groupId', '==', groupId),
      where('userId', '==', userId),
      limit(1)
    )
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return { id: doc.id, ...doc.data() } as GroupMember
    }
    return null
  } catch (error) {
    console.error('Error fetching group member:', error)
    return null
  }
}

/**
 * Get group members
 */
export const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  try {
    const membersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
    const q = query(
      membersRef,
      where('groupId', '==', groupId),
      orderBy('joinedAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GroupMember[]
  } catch (error) {
    console.error('Error fetching group members:', error)
    return []
  }
}

/**
 * Send group invitations
 */
export const sendGroupInvitations = async (
  inviteData: InviteToGroupData,
  adminName: string,
  groupName: string
): Promise<GroupInvitation[]> => {
  try {
    const invitations: GroupInvitation[] = []
    const invitationsRef = collection(db, COLLECTIONS.GROUP_INVITATIONS)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_VALUES.GROUP.INVITATION_EXPIRY_DAYS)

    for (const email of inviteData.emails) {
      const normalizedEmail = email.trim().toLowerCase()
      
      // Check if user exists and notify them if they do
      const existingUser = await getUserByEmail(normalizedEmail)
      
      const invitationCode = generateInvitationCode()
      const invitationData = {
        groupId: inviteData.groupId,
        groupName,
        adminId: inviteData.adminId,
        adminName,
        inviteeEmail: normalizedEmail,
        status: 'pending' as InvitationStatus,
        invitationCode,
        expiresAt,
        createdAt: serverTimestamp(),
        hasAccount: !!existingUser,
      }
      
      const docRef = await addDoc(invitationsRef, invitationData)
      
      // If user exists, create an in-app notification
      if (existingUser) {
        try {
          await createUserNotification(existingUser.id, {
            type: 'group_invitation',
            title: `Group Invitation from ${adminName}`,
            message: `You've been invited to join "${groupName}". Check your invitations to accept.`,
            data: {
              groupId: inviteData.groupId,
              groupName,
              adminName,
              invitationId: docRef.id,
              invitationCode,
            }
          })
          
          // Log activity for the user being invited
          await logActivity(Activities.groupInvitationReceived(
            existingUser.id, 
            inviteData.groupId, 
            groupName, 
            adminName
          ))
        } catch (notificationError) {
          console.error('Error creating notification for existing user:', notificationError)
          // Don't fail the invitation if notification fails
        }
      }
      
      // Log activity for the admin sending the invitation
      try {
        await logActivity(Activities.groupInvitationSent(
          inviteData.adminId,
          inviteData.groupId,
          groupName,
          normalizedEmail
        ))
      } catch (error) {
        console.error('Error logging invitation activity:', error)
      }
      
      invitations.push({
        id: docRef.id,
        ...invitationData,
        expiresAt,
        createdAt: new Date(),
      })
    }

    return invitations
  } catch (error) {
    console.error('Error sending group invitations:', error)
    throw new Error(ERROR_MESSAGES.GROUP.INVITE_FAILED)
  }
}

/**
 * Get invitation by code
 */
export const getInvitationByCode = async (code: string): Promise<GroupInvitation | null> => {
  try {
    const invitationsRef = collection(db, COLLECTIONS.GROUP_INVITATIONS)
    const q = query(invitationsRef, where('invitationCode', '==', code), limit(1))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return { id: doc.id, ...doc.data() } as GroupInvitation
    }
    return null
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return null
  }
}

/**
 * Accept group invitation
 */
export const acceptInvitation = async (
  invitationId: string,
  userId: string,
  userName: string,
  userEmail: string
): Promise<void> => {
  try {
    const invitationRef = doc(db, COLLECTIONS.GROUP_INVITATIONS, invitationId)
    const invitationSnap = await getDoc(invitationRef)
    
    if (!invitationSnap.exists()) {
      throw new Error(ERROR_MESSAGES.GROUP.INVALID_INVITATION)
    }

    const invitation = invitationSnap.data() as GroupInvitation
    
    if (invitation.status !== 'pending') {
      throw new Error(ERROR_MESSAGES.GROUP.INVITATION_ALREADY_USED)
    }

    const now = new Date()
    const expiresAt = invitation.expiresAt instanceof Date 
      ? invitation.expiresAt 
      : invitation.expiresAt.toDate()
      
    if (now > expiresAt) {
      throw new Error(ERROR_MESSAGES.GROUP.INVITATION_EXPIRED)
    }

    // Check if user is already a member
    const existingMember = await getGroupMember(invitation.groupId, userId)
    if (existingMember) {
      throw new Error(ERROR_MESSAGES.GROUP.ALREADY_MEMBER)
    }

    // Check group capacity
    const group = await getGroup(invitation.groupId)
    if (!group) {
      throw new Error(ERROR_MESSAGES.GROUP.GROUP_NOT_FOUND)
    }

    if (group.memberCount >= group.maxMembers) {
      throw new Error(ERROR_MESSAGES.GROUP.GROUP_FULL)
    }

    // Add user to group and update invitation
    await runTransaction(db, async (transaction) => {
      const groupRef = doc(db, COLLECTIONS.GROUPS, invitation.groupId)
      
      // Add member
      const membersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
      const newMemberRef = doc(membersRef)
      const memberData = {
        groupId: invitation.groupId,
        userId,
        userName,
        userEmail,
        role: 'member' as GroupRole,
        joinedAt: serverTimestamp(),
        pointsEarned: 0,
        pointsRedeemed: 0,
      }
      
      transaction.set(newMemberRef, memberData)
      
      // Update group member count
      transaction.update(groupRef, {
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      })
      
      // Update invitation status
      transaction.update(invitationRef, {
        status: 'accepted',
        inviteeUserId: userId,
        acceptedAt: serverTimestamp(),
      })
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to accept invitation')
  }
}

/**
 * Get group invitations (for admin)
 */
export const getGroupInvitations = async (groupId: string): Promise<GroupInvitation[]> => {
  try {
    const invitationsRef = collection(db, COLLECTIONS.GROUP_INVITATIONS)
    const q = query(
      invitationsRef,
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GroupInvitation[]
  } catch (error) {
    console.error('Error fetching group invitations:', error)
    return []
  }
}

/**
 * Get count of pending group invitations (for admin)
 */
export const getGroupInvitationCount = async (groupId: string): Promise<number> => {
  try {
    const invitationsRef = collection(db, COLLECTIONS.GROUP_INVITATIONS)
    const q = query(
      invitationsRef,
      where('groupId', '==', groupId),
      where('status', '==', 'pending')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.size
  } catch (error) {
    console.error('Error fetching group invitation count:', error)
    return 0
  }
}

/**
 * Cancel/Delete invitation
 */
export const cancelInvitation = async (invitationId: string): Promise<void> => {
  try {
    const invitationRef = doc(db, COLLECTIONS.GROUP_INVITATIONS, invitationId)
    await updateDoc(invitationRef, {
      status: 'expired' as InvitationStatus,
    })
  } catch (error) {
    console.error('Error cancelling invitation:', error)
    throw new Error('Failed to cancel invitation')
  }
}

/**
 * Resend invitation (creates new invitation code)
 */
export const resendInvitation = async (
  invitationId: string,
  groupId: string,
  groupName: string,
  adminId: string,
  adminName: string,
  inviteeEmail: string
): Promise<GroupInvitation> => {
  try {
    // Cancel old invitation
    await cancelInvitation(invitationId)
    
    // Create new invitation
    const invitationsRef = collection(db, COLLECTIONS.GROUP_INVITATIONS)
    const newInvitationCode = generateInvitationCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_VALUES.GROUP.INVITATION_EXPIRY_DAYS)

    const invitationData = {
      groupId,
      groupName,
      adminId,
      adminName,
      inviteeEmail,
      status: 'pending' as InvitationStatus,
      invitationCode: newInvitationCode,
      expiresAt,
      createdAt: serverTimestamp(),
    }
    
    const docRef = await addDoc(invitationsRef, invitationData)
    
    return {
      id: docRef.id,
      ...invitationData,
      expiresAt,
      createdAt: new Date(),
    }
  } catch (error) {
    console.error('Error resending invitation:', error)
    throw new Error('Failed to resend invitation')
  }
}

/**
 * Generate invitation link
 */
export const generateInvitationLink = (invitationCode: string): string => {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  return `${baseUrl}/invite/${invitationCode}`
}

/**
 * Get pending group invitations for admin's groups
 */
export const getPendingGroupInvitations = async (adminId: string): Promise<GroupInvitation[]> => {
  try {
    const invitationsRef = collection(db, COLLECTIONS.GROUP_INVITATIONS)
    const pendingQuery = query(
      invitationsRef,
      where('adminId', '==', adminId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(pendingQuery)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate?.() || new Date(),
    })) as GroupInvitation[]
  } catch (error) {
    console.error('Error fetching pending group invitations:', error)
    return []
  }
}

/**
 * Get group and member statistics for admin's groups
 */
export const getAdminGroupStats = async (adminId: string) => {
  try {
    // Get all groups where user is admin
    const groupsRef = collection(db, COLLECTIONS.GROUPS)
    const adminGroupsQuery = query(groupsRef, where('adminId', '==', adminId))
    const adminGroupsSnapshot = await getDocs(adminGroupsQuery)
    
    if (adminGroupsSnapshot.empty) {
      return {
        totalGroups: 0,
        totalMembers: 0,
        pendingInvitations: 0,
        pendingJoinRequests: 0,
        recentJoins: 0,
        averageMembersPerGroup: 0
      }
    }
    
    const adminGroupIds = adminGroupsSnapshot.docs.map(doc => doc.id)
    const groups = adminGroupsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Calculate total members across all admin groups
    const totalMembers = groups.reduce((sum, group: any) => sum + (group.memberCount || 0), 0)
    
    // Get pending invitations count
    const invitationsRef = collection(db, COLLECTIONS.GROUP_INVITATIONS)
    const pendingInvitationsQuery = query(
      invitationsRef,
      where('adminId', '==', adminId),
      where('status', '==', 'pending')
    )
    const pendingInvitationsSnapshot = await getDocs(pendingInvitationsQuery)
    
    // Get pending join requests count
    const joinRequestsRef = collection(db, COLLECTIONS.GROUP_JOIN_REQUESTS)
    const pendingJoinRequestsQuery = query(
      joinRequestsRef,
      where('groupId', 'in', adminGroupIds),
      where('status', '==', 'pending')
    )
    const pendingJoinRequestsSnapshot = await getDocs(pendingJoinRequestsQuery)
    
    // Get recent joins (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const membersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
    const recentJoinsQuery = query(
      membersRef,
      where('groupId', 'in', adminGroupIds),
      where('joinedAt', '>=', sevenDaysAgo)
    )
    const recentJoinsSnapshot = await getDocs(recentJoinsQuery)
    
    return {
      totalGroups: adminGroupsSnapshot.size,
      totalMembers,
      pendingInvitations: pendingInvitationsSnapshot.size,
      pendingJoinRequests: pendingJoinRequestsSnapshot.size,
      recentJoins: recentJoinsSnapshot.size,
      averageMembersPerGroup: totalMembers / adminGroupsSnapshot.size
    }
  } catch (error) {
    console.error('Error fetching admin group stats:', error)
    return {
      totalGroups: 0,
      totalMembers: 0,
      pendingInvitations: 0,
      pendingJoinRequests: 0,
      recentJoins: 0,
      averageMembersPerGroup: 0
    }
  }
}

/**
 * Submit a join request for a group (replaces immediate joining)
 */
export const submitJoinRequest = async (
  userId: string,
  userName: string,
  userEmail: string,
  groupCode: string
): Promise<void> => {
  try {
    const group = await getGroupByCode(groupCode)
    
    if (!group) {
      throw new Error(ERROR_MESSAGES.GROUP.INVALID_CODE)
    }

    // Check if user is already a member
    const existingMember = await getGroupMember(group.id, userId)
    if (existingMember) {
      throw new Error(ERROR_MESSAGES.GROUP.ALREADY_MEMBER)
    }

    // Check if user already has a pending request
    const joinRequestsRef = collection(db, COLLECTIONS.GROUP_JOIN_REQUESTS)
    const existingRequestQuery = query(
      joinRequestsRef,
      where('groupId', '==', group.id),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    )
    const existingRequestSnapshot = await getDocs(existingRequestQuery)
    
    if (!existingRequestSnapshot.empty) {
      throw new Error('You already have a pending join request for this group.')
    }

    // Check if group is full
    if (group.memberCount >= group.maxMembers) {
      throw new Error(ERROR_MESSAGES.GROUP.GROUP_FULL)
    }

    // Create join request
    const joinRequestData = {
      groupId: group.id,
      groupName: group.name,
      userId,
      userName,
      userEmail,
      status: 'pending' as JoinRequestStatus,
      requestedAt: serverTimestamp(),
    }
    
    await addDoc(joinRequestsRef, joinRequestData)
    
    // Log activity for the user submitting the join request
    try {
      await logActivity(Activities.joinRequestSubmitted(userId, group.id, group.name))
    } catch (error) {
      console.error('Error logging join request activity:', error)
    }
  } catch (error) {
    console.error('Error submitting join request:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to submit join request')
  }
}

/**
 * Get pending join requests for admin's groups
 */
export const getPendingJoinRequests = async (adminId: string): Promise<GroupJoinRequest[]> => {
  try {
    // First, get all groups where user is admin
    const groupsRef = collection(db, COLLECTIONS.GROUPS)
    const adminGroupsQuery = query(groupsRef, where('adminId', '==', adminId))
    const adminGroupsSnapshot = await getDocs(adminGroupsQuery)
    
    if (adminGroupsSnapshot.empty) {
      return []
    }
    
    const adminGroupIds = adminGroupsSnapshot.docs.map(doc => doc.id)
    
    // Get pending join requests for these groups
    const joinRequestsRef = collection(db, COLLECTIONS.GROUP_JOIN_REQUESTS)
    const pendingRequestsQuery = query(
      joinRequestsRef,
      where('groupId', 'in', adminGroupIds),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    )
    
    const snapshot = await getDocs(pendingRequestsQuery)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toDate?.() || new Date(),
    })) as GroupJoinRequest[]
  } catch (error) {
    console.error('Error fetching pending join requests:', error)
    return []
  }
}

/**
 * Approve a join request and add user as member
 */
export const approveJoinRequest = async (
  requestId: string,
  adminId: string,
  adminName: string
): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      // Get the join request
      const requestRef = doc(db, COLLECTIONS.GROUP_JOIN_REQUESTS, requestId)
      const requestSnap = await transaction.get(requestRef)
      
      if (!requestSnap.exists()) {
        throw new Error('Join request not found')
      }
      
      const joinRequest = requestSnap.data() as GroupJoinRequest
      
      if (joinRequest.status !== 'pending') {
        throw new Error('Join request has already been processed')
      }
      
      // Get the group to verify admin and check capacity
      const groupRef = doc(db, COLLECTIONS.GROUPS, joinRequest.groupId)
      const groupSnap = await transaction.get(groupRef)
      
      if (!groupSnap.exists()) {
        throw new Error('Group not found')
      }
      
      const group = groupSnap.data() as Group
      
      if (group.adminId !== adminId) {
        throw new Error('Only group admin can approve join requests')
      }
      
      if (group.memberCount >= group.maxMembers) {
        throw new Error('Group is full')
      }
      
      // Check if user is already a member (race condition protection)
      const existingMember = await getGroupMember(joinRequest.groupId, joinRequest.userId)
      if (existingMember) {
        throw new Error('User is already a member of this group')
      }
      
      // Add user as member
      const membersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
      const newMemberRef = doc(membersRef)
      const memberData = {
        groupId: joinRequest.groupId,
        userId: joinRequest.userId,
        userName: joinRequest.userName,
        userEmail: joinRequest.userEmail,
        role: 'member' as GroupRole,
        joinedAt: serverTimestamp(),
        pointsEarned: 0,
        pointsRedeemed: 0,
      }
      
      transaction.set(newMemberRef, memberData)
      
      // Update group member count
      transaction.update(groupRef, {
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      })
      
      // Update join request status
      transaction.update(requestRef, {
        status: 'approved',
        processedAt: serverTimestamp(),
        processedBy: adminId,
        processedByName: adminName,
      })
    })
    
    // Log activities for join request approval (after transaction succeeds)
    try {
      const requestRef = doc(db, COLLECTIONS.GROUP_JOIN_REQUESTS, requestId)
      const requestSnap = await getDoc(requestRef)
      
      if (requestSnap.exists()) {
        const joinRequest = requestSnap.data() as GroupJoinRequest
        
        // Log activity for the user who got approved
        await logActivity(Activities.joinRequestApproved(
          joinRequest.userId,
          joinRequest.groupId,
          joinRequest.groupName,
          adminName
        ))
        
        // Log activity for joining the group
        await logActivity(Activities.groupJoined(
          joinRequest.userId,
          joinRequest.groupId,
          joinRequest.groupName
        ))
      }
    } catch (error) {
      console.error('Error logging join approval activities:', error)
    }
  } catch (error) {
    console.error('Error approving join request:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to approve join request')
  }
}

/**
 * Reject a join request
 */
export const rejectJoinRequest = async (
  requestId: string,
  adminId: string,
  adminName: string,
  reason?: string
): Promise<void> => {
  try {
    const requestRef = doc(db, COLLECTIONS.GROUP_JOIN_REQUESTS, requestId)
    const requestSnap = await getDoc(requestRef)
    
    if (!requestSnap.exists()) {
      throw new Error('Join request not found')
    }
    
    const joinRequest = requestSnap.data() as GroupJoinRequest
    
    if (joinRequest.status !== 'pending') {
      throw new Error('Join request has already been processed')
    }
    
    // Verify admin permissions
    const group = await getGroup(joinRequest.groupId)
    if (!group || group.adminId !== adminId) {
      throw new Error('Only group admin can reject join requests')
    }
    
    // Update join request status
    await updateDoc(requestRef, {
      status: 'rejected',
      processedAt: serverTimestamp(),
      processedBy: adminId,
      processedByName: adminName,
      rejectionReason: reason || 'No reason provided',
    })
  } catch (error) {
    console.error('Error rejecting join request:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to reject join request')
  }
}