import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { 
  UserProfile, 
  CreateUserProfileData, 
  PointsTransaction,
  CreateTransactionData,
  TransactionType,
  GroupPenalty,
  CreatePenaltyData,
  GroupPenaltyType,
  CreatePenaltyTypeData,
  UpdatePenaltyTypeData
} from '@/types'
import { COLLECTIONS, DEFAULT_VALUES, ERROR_MESSAGES } from '@/lib/constants'

// User operations
/**
 * Create a new user profile in Firestore
 */
export const createUserProfile = async (
  userId: string, 
  userData: CreateUserProfileData
): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId)
    const timestamp = serverTimestamp()
    
    await setDoc(userRef, {
      ...userData,
      currentPoints: DEFAULT_VALUES.POINTS.INITIAL,
      totalEarned: DEFAULT_VALUES.POINTS.INITIAL,
      totalRedeemed: DEFAULT_VALUES.POINTS.INITIAL,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  } catch (error) {
    console.error('Error creating user profile:', error)
    throw new Error(ERROR_MESSAGES.FIRESTORE.CREATE_PROFILE_FAILED)
  }
}

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId)
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists()) {
      const data = userSnap.data()
      return { 
        id: userSnap.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
      } as UserProfile
    }
    return null
  } catch (error) {
    console.error('Error fetching user profile:', error)
    throw new Error(ERROR_MESSAGES.FIRESTORE.FETCH_PROFILE_FAILED)
  }
}

/**
 * Get user profile by email address
 */
export const getUserByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS)
    const q = query(usersRef, where('email', '==', email.toLowerCase().trim()), limit(1))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      const data = doc.data()
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
      } as UserProfile
    }
    return null
  } catch (error) {
    console.error('Error fetching user by email:', error)
    return null
  }
}

/**
 * Update user profile in Firestore
 */
export const updateUserProfile = async (
  userId: string, 
  updates: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId)
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw new Error(ERROR_MESSAGES.FIRESTORE.UPDATE_PROFILE_FAILED)
  }
}

// Points operations
/**
 * Add a points transaction and update user points
 */
export const addPointsTransaction = async (
  transactionData: CreateTransactionData
): Promise<string> => {
  const { userId, type, amount, description } = transactionData
  
  if (amount <= 0) {
    throw new Error('Transaction amount must be positive')
  }

  try {
    // Check if user has sufficient points for redemption or penalty
    if (type === 'redeem' || type === 'penalty') {
      const userProfile = await getUserProfile(userId)
      if (!userProfile || userProfile.currentPoints < amount) {
        throw new Error(ERROR_MESSAGES.FIRESTORE.INSUFFICIENT_POINTS)
      }
    }

    const userRef = doc(db, COLLECTIONS.USERS, userId)
    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS)
    
    // Add transaction record
    const docRef = await addDoc(transactionsRef, {
      userId,
      type,
      amount,
      description: description.trim(),
      createdAt: serverTimestamp(),
    })
    
    // Update user points
    const pointsChange = type === 'earn' ? amount : -amount
    const updates: any = {
      currentPoints: increment(pointsChange),
      updatedAt: serverTimestamp(),
    }
    
    if (type === 'earn') {
      updates.totalEarned = increment(amount)
    } else if (type === 'redeem') {
      updates.totalRedeemed = increment(amount)
    }
    // For penalty, we don't update totalEarned or totalRedeemed as it's separate
    
    await updateDoc(userRef, updates)
    
    return docRef.id
  } catch (error) {
    console.error('Error adding points transaction:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error(ERROR_MESSAGES.FIRESTORE.TRANSACTION_FAILED)
  }
}

/**
 * Get user transactions with pagination
 */
export const getUserTransactions = async (
  userId: string, 
  limitCount = DEFAULT_VALUES.PAGINATION.TRANSACTIONS_LIMIT
): Promise<PointsTransaction[]> => {
  try {
    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS)
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PointsTransaction[]
  } catch (error) {
    console.error('Error fetching user transactions:', error)
    return []
  }
}

/**
 * Create a penalty record and deduct points from user
 */
export const createGroupPenalty = async (
  penaltyData: CreatePenaltyData
): Promise<string> => {
  const { groupId, groupName, adminId, adminName, memberId, memberName, title, description, amount } = penaltyData
  
  if (amount <= 0) {
    throw new Error('Penalty amount must be positive')
  }

  if (adminId === memberId) {
    throw new Error(ERROR_MESSAGES.GROUP.CANNOT_PENALIZE_SELF)
  }

  try {
    // Check if user has sufficient points
    const userProfile = await getUserProfile(memberId)
    if (!userProfile || userProfile.currentPoints < amount) {
      throw new Error(ERROR_MESSAGES.GROUP.INSUFFICIENT_POINTS_FOR_PENALTY)
    }

    // Create penalty transaction
    const penaltyTransactionId = await addPointsTransaction({
      userId: memberId,
      type: 'penalty',
      amount,
      description: `Penalty: ${title}`,
    })

    // Create penalty record
    const penaltiesRef = collection(db, COLLECTIONS.GROUP_PENALTIES)
    const penaltyDocRef = await addDoc(penaltiesRef, {
      groupId,
      groupName,
      adminId,
      adminName,
      memberId,
      memberName,
      title: title.trim(),
      description: description.trim(),
      amount,
      transactionId: penaltyTransactionId,
      createdAt: serverTimestamp(),
    })

    return penaltyDocRef.id
  } catch (error) {
    console.error('Error creating group penalty:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error(ERROR_MESSAGES.GROUP.PENALTY_FAILED)
  }
}

/**
 * Get penalties for a group
 */
export const getGroupPenalties = async (
  groupId: string,
  limitCount = DEFAULT_VALUES.PAGINATION.DEFAULT_LIMIT
): Promise<GroupPenalty[]> => {
  try {
    const penaltiesRef = collection(db, COLLECTIONS.GROUP_PENALTIES)
    const q = query(
      penaltiesRef,
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GroupPenalty[]
  } catch (error) {
    console.error('Error fetching group penalties:', error)
    return []
  }
}

/**
 * Create a penalty type for a group
 */
export const createGroupPenaltyType = async (
  penaltyTypeData: CreatePenaltyTypeData
): Promise<string> => {
  const { groupId, groupName, title, description, amount, createdBy, createdByName } = penaltyTypeData
  
  if (amount <= 0) {
    throw new Error('Penalty amount must be positive')
  }

  try {
    const penaltyTypesRef = collection(db, COLLECTIONS.GROUP_PENALTY_TYPES)
    const penaltyTypeDocRef = await addDoc(penaltyTypesRef, {
      groupId,
      groupName,
      title: title.trim(),
      description: description.trim(),
      amount,
      isActive: true,
      createdBy,
      createdByName,
      createdAt: serverTimestamp(),
    })

    return penaltyTypeDocRef.id
  } catch (error) {
    console.error('Error creating group penalty type:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to create penalty type')
  }
}

/**
 * Get penalty types for a group
 */
export const getGroupPenaltyTypes = async (
  groupId: string,
  limitCount = DEFAULT_VALUES.PAGINATION.DEFAULT_LIMIT
): Promise<GroupPenaltyType[]> => {
  try {
    const penaltyTypesRef = collection(db, COLLECTIONS.GROUP_PENALTY_TYPES)
    const q = query(
      penaltyTypesRef,
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GroupPenaltyType[]
  } catch (error) {
    console.error('Error fetching group penalty types:', error)
    return []
  }
}

/**
 * Delete a penalty type
 */
export const deleteGroupPenaltyType = async (penaltyTypeId: string): Promise<void> => {
  try {
    const penaltyTypeRef = doc(db, COLLECTIONS.GROUP_PENALTY_TYPES, penaltyTypeId)
    await deleteDoc(penaltyTypeRef)
  } catch (error) {
    console.error('Error deleting penalty type:', error)
    throw new Error('Failed to delete penalty type')
  }
}

/**
 * Update a penalty type
 */
export const updateGroupPenaltyType = async (
  penaltyTypeId: string, 
  updateData: UpdatePenaltyTypeData
): Promise<void> => {
  try {
    const penaltyTypeRef = doc(db, COLLECTIONS.GROUP_PENALTY_TYPES, penaltyTypeId)
    await updateDoc(penaltyTypeRef, updateData as any)
  } catch (error) {
    console.error('Error updating penalty type:', error)
    throw new Error('Failed to update penalty type')
  }
}

/**
 * Update username across all related documents in Firestore
 * This function updates the user's display name in:
 * - User profile (users collection)
 * - Group memberships (groupMembers collection)
 * - Groups where user is admin (groups collection - adminName field)
 * - Group invitations where user is admin (groupInvitations collection - adminName field)
 */
export const updateUsernameAcrossDatabase = async (
  userId: string,
  newUsername: string
): Promise<void> => {
  try {
    const batch = writeBatch(db)
    const trimmedUsername = newUsername.trim()

    console.log(`Updating username for user ${userId} to "${trimmedUsername}"`)

    // 1. Update user profile
    const userRef = doc(db, COLLECTIONS.USERS, userId)
    batch.update(userRef, {
      name: trimmedUsername,
      updatedAt: serverTimestamp(),
    })

    // 2. Update group memberships (groupMembers collection)
    const groupMembersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
    const memberQuery = query(groupMembersRef, where('userId', '==', userId))
    const memberSnapshot = await getDocs(memberQuery)
    
    console.log(`Found ${memberSnapshot.size} group memberships to update`)
    memberSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        userName: trimmedUsername,
      })
    })

    // 3. Update groups where user is admin (groups collection)
    const groupsRef = collection(db, COLLECTIONS.GROUPS)
    const adminGroupQuery = query(groupsRef, where('adminId', '==', userId))
    const adminGroupSnapshot = await getDocs(adminGroupQuery)
    
    console.log(`Found ${adminGroupSnapshot.size} groups where user is admin`)
    adminGroupSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        adminName: trimmedUsername,
        updatedAt: serverTimestamp(),
      })
    })

    // 4. Update group invitations where user is admin (groupInvitations collection)
    const invitationsRef = collection(db, COLLECTIONS.GROUP_INVITATIONS)
    const adminInvitationQuery = query(invitationsRef, where('adminId', '==', userId))
    const adminInvitationSnapshot = await getDocs(adminInvitationQuery)
    
    console.log(`Found ${adminInvitationSnapshot.size} invitations where user is admin`)
    adminInvitationSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        adminName: trimmedUsername,
      })
    })

    // Execute all updates in a single batch
    await batch.commit()
    
    console.log(`Successfully updated username to "${trimmedUsername}" across all collections`)
  } catch (error) {
    console.error('Error updating username across database:', error)
    throw new Error('Failed to update username in all related documents')
  }
}

// Notification operations
/**
 * Create a notification for a user
 */
export const createUserNotification = async (
  userId: string,
  notification: {
    type: 'group_invitation' | 'group_join_approved' | 'task_approved' | 'points_awarded' | 'general'
    title: string
    message: string
    data?: any
  }
): Promise<string> => {
  try {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS)
    const docRef = await addDoc(notificationsRef, {
      userId,
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating notification:', error)
    throw new Error('Failed to create notification')
  }
}

/**
 * Get user notifications
 */
export const getUserNotifications = async (
  userId: string,
  limitCount = 20
): Promise<any[]> => {
  try {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS)
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[]
    
    // Sort by createdAt descending (client-side to avoid index requirement)
    return notifications.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
      return bDate.getTime() - aDate.getTime()
    })
  } catch (error) {
    console.error('Error fetching user notifications:', error)
    return []
  }
}

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId)
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw new Error('Failed to mark notification as read')
  }
}

/**
 * Get unread notifications count for a user
 */
export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  try {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS)
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.size
  } catch (error) {
    console.error('Error fetching unread notifications count:', error)
    return 0
  }
}