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
  CreateGroupData,
  InviteToGroupData,
  GroupRole,
  InvitationStatus,
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
    
    // Include all groups, but add membership info to identify deactivated ones
    const groupsWithMembership: Array<Group & { isUserActive?: boolean }> = []
    
    for (const doc of memberSnapshot.docs) {
      const memberData = doc.data()
      const group = await getGroup(memberData.groupId)
      if (group) {
        groupsWithMembership.push({
          ...group,
          isUserActive: memberData.isActive !== false
        })
      }
    }
    
    return groupsWithMembership.sort((a, b) => {
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
      isActive: true,
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
    
    const members = querySnapshot.docs.map(doc => {
      const data = doc.data()
      const member = {
        id: doc.id,
        ...data,
        isActive: data.isActive !== false // Default to true for existing members
      } as GroupMember
      
      console.log('🔧 Processing member:', member.userName, 'isActive from DB:', data.isActive, 'final isActive:', member.isActive)
      return member
    })
    
    console.log('🔧 Found', members.length, 'members for group', groupId)
    return members
  } catch (error) {
    console.error('Error fetching group members:', error)
    return []
  }
}

/**
 * Get active group members only
 */
export const getActiveGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  try {
    const allMembers = await getGroupMembers(groupId)
    return allMembers.filter(member => member.isActive !== false)
  } catch (error) {
    console.error('Error fetching active group members:', error)
    return []
  }
}

/**
 * Deactivate a member from a group (Admin only)
 */
export const deactivateGroupMember = async (
  groupId: string,
  memberUserId: string,
  adminId: string
): Promise<void> => {
  try {
    console.log('🔧 Starting deactivateGroupMember:', { groupId, memberUserId, adminId })
    
    // Verify admin permissions
    const group = await getGroup(groupId)
    console.log('🔧 Group found:', group ? 'Yes' : 'No', group?.adminId === adminId ? 'Admin match' : 'Admin mismatch')
    if (!group || group.adminId !== adminId) {
      throw new Error('Unauthorized: Only group admin can deactivate members')
    }

    // Prevent admin from deactivating themselves
    if (memberUserId === adminId) {
      throw new Error('Admin cannot deactivate themselves from the group')
    }

    // Get the member record to deactivate
    const member = await getGroupMember(groupId, memberUserId)
    console.log('🔧 Member found:', member ? 'Yes' : 'No', 'isActive:', member?.isActive)
    if (!member) {
      throw new Error('Member not found in the group')
    }

    if (member.isActive === false) {
      throw new Error('Member is already deactivated')
    }

    // Start a transaction to update group stats and deactivate member
    console.log('🔧 Starting transaction for member deactivation')
    await runTransaction(db, async (transaction) => {
      // Get group reference for updating member count
      const groupRef = doc(db, COLLECTIONS.GROUPS, groupId)
      
      // Get member reference for deactivation
      const memberRef = doc(db, COLLECTIONS.GROUP_MEMBERS, member.id)
      
      console.log('🔧 Updating group member count and deactivating member')
      // Update group member count (subtract 1 for deactivated member)
      transaction.update(groupRef, {
        memberCount: increment(-1),
        updatedAt: serverTimestamp()
      })
      
      // Deactivate the member instead of deleting
      transaction.update(memberRef, {
        isActive: false,
        deactivatedAt: serverTimestamp(),
        deactivatedBy: adminId
      })
    })

    console.log('🔧 Transaction completed, logging activity')
    // Log the activity
    await logActivity(Activities.memberRemoved(adminId, groupId, group.name, member.userName || 'Unknown User'))
    
    console.log('🔧 Member deactivation completed successfully')

  } catch (error) {
    console.error('Error deactivating group member:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to deactivate member from group')
  }
}

/**
 * Activate a member in a group (Admin only)
 */
export const activateGroupMember = async (
  groupId: string,
  memberUserId: string,
  adminId: string
): Promise<void> => {
  try {
    console.log('🔧 Starting activateGroupMember:', { groupId, memberUserId, adminId })
    
    // Verify admin permissions
    const group = await getGroup(groupId)
    console.log('🔧 Group found:', group ? 'Yes' : 'No', group?.adminId === adminId ? 'Admin match' : 'Admin mismatch')
    if (!group || group.adminId !== adminId) {
      throw new Error('Unauthorized: Only group admin can activate members')
    }

    // Get the member record to activate
    const member = await getGroupMember(groupId, memberUserId)
    console.log('🔧 Member found:', member ? 'Yes' : 'No', 'isActive:', member?.isActive)
    if (!member) {
      throw new Error('Member not found in the group')
    }

    if (member.isActive !== false) {
      throw new Error('Member is already active')
    }

    // Check group capacity
    if (group.memberCount >= group.maxMembers) {
      throw new Error('Group is full - cannot activate member')
    }

    // Start a transaction to update group stats and activate member
    console.log('🔧 Starting transaction for member activation')
    await runTransaction(db, async (transaction) => {
      // Get group reference for updating member count
      const groupRef = doc(db, COLLECTIONS.GROUPS, groupId)
      
      // Get member reference for activation
      const memberRef = doc(db, COLLECTIONS.GROUP_MEMBERS, member.id)
      
      console.log('🔧 Updating group member count and activating member')
      // Update group member count (add 1 for activated member)
      transaction.update(groupRef, {
        memberCount: increment(1),
        updatedAt: serverTimestamp()
      })
      
      // Activate the member
      transaction.update(memberRef, {
        isActive: true,
        reactivatedAt: serverTimestamp(),
        reactivatedBy: adminId
      })
    })

    console.log('🔧 Transaction completed, logging activity')
    // Log the activity
    await logActivity(Activities.memberActivated(adminId, groupId, group.name, member.userName || 'Unknown User'))
    
    console.log('🔧 Member activation completed successfully')

  } catch (error) {
    console.error('Error activating group member:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to activate member in group')
  }
}

/**
 * Remove a member from a group (Admin only) - Legacy function for backward compatibility
 * @deprecated Use deactivateGroupMember instead
 */
export const removeGroupMember = deactivateGroupMember

/**
 * Check which emails correspond to existing group members
 */
export const checkExistingGroupMembers = async (
  groupId: string,
  emails: string[]
): Promise<string[]> => {
  try {
    const members = await getGroupMembers(groupId)
    const memberEmails = members
      .filter(member => member.isActive !== false) // Only check active members
      .map(member => member.userEmail.toLowerCase())
    
    const normalizedEmails = emails.map(email => email.toLowerCase())
    const existingMembers = normalizedEmails.filter(email => memberEmails.includes(email))
    
    return existingMembers
  } catch (error) {
    console.error('Error checking existing group members:', error)
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
    // Check for existing group members first
    const existingMemberEmails = await checkExistingGroupMembers(inviteData.groupId, inviteData.emails)
    if (existingMemberEmails.length > 0) {
      const errorMessage = existingMemberEmails.length === 1
        ? `${existingMemberEmails[0]} is already a member of this group`
        : `The following users are already group members: ${existingMemberEmails.join(', ')}`
      throw new Error(errorMessage)
    }

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
        isActive: true,
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
      recentJoins: recentJoinsSnapshot.size,
      averageMembersPerGroup: totalMembers / adminGroupsSnapshot.size
    }
  } catch (error) {
    console.error('Error fetching admin group stats:', error)
    return {
      totalGroups: 0,
      totalMembers: 0,
      pendingInvitations: 0,
      recentJoins: 0,
      averageMembersPerGroup: 0
    }
  }
}




