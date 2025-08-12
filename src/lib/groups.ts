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
  JoinGroupData,
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
 * Join group by code
 */
export const joinGroupByCode = async (
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

    // Check if group is full
    if (group.memberCount >= group.maxMembers) {
      throw new Error(ERROR_MESSAGES.GROUP.GROUP_FULL)
    }

    // Add user as member and increment member count
    await runTransaction(db, async (transaction) => {
      const groupRef = doc(db, COLLECTIONS.GROUPS, group.id)
      
      // Add member
      const membersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
      const newMemberRef = doc(membersRef)
      const memberData = {
        groupId: group.id,
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
    })
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
      const invitationCode = generateInvitationCode()
      const invitationData = {
        groupId: inviteData.groupId,
        groupName,
        adminId: inviteData.adminId,
        adminName,
        inviteeEmail: email.trim().toLowerCase(),
        status: 'pending' as InvitationStatus,
        invitationCode,
        expiresAt,
        createdAt: serverTimestamp(),
      }
      
      const docRef = await addDoc(invitationsRef, invitationData)
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