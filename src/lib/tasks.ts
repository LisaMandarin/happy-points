import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  runTransaction,
  increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  GroupTask,
  TaskCompletion,
  CreateTaskData,
  UpdateTaskData,
} from '@/types'
import { COLLECTIONS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants'

/**
 * Create a new task for a group (admin only)
 */
export const createGroupTask = async (
  groupId: string,
  adminId: string,
  adminName: string,
  taskData: CreateTaskData
): Promise<string> => {
  try {
    if (taskData.points <= 0) {
      throw new Error(ERROR_MESSAGES.TASK.INVALID_POINTS)
    }

    const tasksRef = collection(db, COLLECTIONS.GROUP_TASKS)
    const timestamp = serverTimestamp()
    
    const task = {
      groupId,
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      points: taskData.points,
      isActive: true,
      createdBy: adminId,
      createdByName: adminName,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const docRef = await addDoc(tasksRef, task)
    return docRef.id
  } catch (error) {
    console.error('Error creating task:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error(ERROR_MESSAGES.TASK.CREATE_FAILED)
  }
}

/**
 * Get all tasks for a group
 */
export const getGroupTasks = async (groupId: string): Promise<GroupTask[]> => {
  try {
    const tasksRef = collection(db, COLLECTIONS.GROUP_TASKS)
    const q = query(
      tasksRef,
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GroupTask[]
  } catch (error) {
    console.error('Error fetching group tasks:', error)
    return []
  }
}

/**
 * Get active tasks for a group (for members to view)
 */
export const getActiveGroupTasks = async (groupId: string): Promise<GroupTask[]> => {
  try {
    const tasksRef = collection(db, COLLECTIONS.GROUP_TASKS)
    const q = query(
      tasksRef,
      where('groupId', '==', groupId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GroupTask[]
  } catch (error) {
    console.error('Error fetching active group tasks:', error)
    return []
  }
}

/**
 * Update a task (admin only)
 */
export const updateGroupTask = async (
  taskId: string,
  updates: UpdateTaskData
): Promise<void> => {
  try {
    if (updates.points !== undefined && updates.points <= 0) {
      throw new Error(ERROR_MESSAGES.TASK.INVALID_POINTS)
    }

    const taskRef = doc(db, COLLECTIONS.GROUP_TASKS, taskId)
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    }

    // Trim string fields
    if (updates.title) {
      updateData.title = updates.title.trim()
    }
    if (updates.description) {
      updateData.description = updates.description.trim()
    }

    await updateDoc(taskRef, updateData)
  } catch (error) {
    console.error('Error updating task:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error(ERROR_MESSAGES.TASK.UPDATE_FAILED)
  }
}

/**
 * Delete a task (admin only)
 */
export const deleteGroupTask = async (taskId: string): Promise<void> => {
  try {
    const taskRef = doc(db, COLLECTIONS.GROUP_TASKS, taskId)
    await deleteDoc(taskRef)
  } catch (error) {
    console.error('Error deleting task:', error)
    throw new Error(ERROR_MESSAGES.TASK.DELETE_FAILED)
  }
}

/**
 * Get a single task by ID
 */
export const getTask = async (taskId: string): Promise<GroupTask | null> => {
  try {
    const taskRef = doc(db, COLLECTIONS.GROUP_TASKS, taskId)
    const taskSnap = await getDoc(taskRef)
    
    if (taskSnap.exists()) {
      return { id: taskSnap.id, ...taskSnap.data() } as GroupTask
    }
    return null
  } catch (error) {
    console.error('Error fetching task:', error)
    return null
  }
}

/**
 * Complete a task (for group members)
 */
export const completeTask = async (
  taskId: string,
  userId: string,
  userName: string
): Promise<string> => {
  try {
    // Get task details
    const task = await getTask(taskId)
    if (!task) {
      throw new Error(ERROR_MESSAGES.TASK.NOT_FOUND)
    }

    if (!task.isActive) {
      throw new Error(ERROR_MESSAGES.TASK.NOT_ACTIVE)
    }

    // Check if user already completed this task
    const existingCompletion = await getTaskCompletion(taskId, userId)
    if (existingCompletion) {
      throw new Error(ERROR_MESSAGES.TASK.ALREADY_COMPLETED)
    }

    // Create task completion record
    const completionsRef = collection(db, COLLECTIONS.TASK_COMPLETIONS)
    const completionData = {
      taskId,
      groupId: task.groupId,
      userId,
      userName,
      completedAt: serverTimestamp(),
      pointsAwarded: task.points,
      status: 'pending' as const,
    }

    const docRef = await addDoc(completionsRef, completionData)
    return docRef.id
  } catch (error) {
    console.error('Error completing task:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to complete task')
  }
}

/**
 * Get task completion by task and user
 */
export const getTaskCompletion = async (
  taskId: string,
  userId: string
): Promise<TaskCompletion | null> => {
  try {
    const completionsRef = collection(db, COLLECTIONS.TASK_COMPLETIONS)
    const q = query(
      completionsRef,
      where('taskId', '==', taskId),
      where('userId', '==', userId)
    )
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return { id: doc.id, ...doc.data() } as TaskCompletion
    }
    return null
  } catch (error) {
    console.error('Error fetching task completion:', error)
    return null
  }
}

/**
 * Get task completions for a group (admin view)
 */
export const getGroupTaskCompletions = async (groupId: string): Promise<TaskCompletion[]> => {
  try {
    const completionsRef = collection(db, COLLECTIONS.TASK_COMPLETIONS)
    const q = query(
      completionsRef,
      where('groupId', '==', groupId),
      orderBy('completedAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskCompletion[]
  } catch (error) {
    console.error('Error fetching group task completions:', error)
    return []
  }
}

/**
 * Approve task completion and award points (admin only)
 */
export const approveTaskCompletion = async (
  completionId: string,
  adminId: string,
  adminName: string
): Promise<void> => {
  try {
    const completionRef = doc(db, COLLECTIONS.TASK_COMPLETIONS, completionId)
    const completionSnap = await getDoc(completionRef)
    
    if (!completionSnap.exists()) {
      throw new Error('Task completion not found')
    }

    const completion = completionSnap.data() as TaskCompletion
    
    if (completion.status !== 'pending') {
      throw new Error('Task completion already processed')
    }

    // Get task details to use task title in transaction description
    const task = await getTask(completion.taskId)
    const taskTitle = task?.title || 'Unknown Task'

    // Use transaction to update completion and award points
    await runTransaction(db, async (transaction) => {
      // Update completion status
      transaction.update(completionRef, {
        status: 'approved',
        approvedBy: adminId,
        approvedByName: adminName,
        approvedAt: serverTimestamp(),
      })

      // Award points to user
      const userRef = doc(db, COLLECTIONS.USERS, completion.userId)
      transaction.update(userRef, {
        currentPoints: increment(completion.pointsAwarded),
        totalEarned: increment(completion.pointsAwarded),
        updatedAt: serverTimestamp(),
      })

      // Update group member points
      const membersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
      const memberQuery = query(
        membersRef,
        where('groupId', '==', completion.groupId),
        where('userId', '==', completion.userId)
      )
      const memberSnapshot = await getDocs(memberQuery)
      
      if (!memberSnapshot.empty) {
        const memberDoc = memberSnapshot.docs[0]
        transaction.update(memberDoc.ref, {
          pointsEarned: increment(completion.pointsAwarded),
        })
      }

      // Create transaction record with task title instead of task ID
      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS)
      const transactionData = {
        userId: completion.userId,
        type: 'earn',
        amount: completion.pointsAwarded,
        description: `Task completed: ${taskTitle}`,
        createdAt: serverTimestamp(),
      }
      const newTransactionRef = doc(transactionsRef)
      transaction.set(newTransactionRef, transactionData)
    })
  } catch (error) {
    console.error('Error approving task completion:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to approve task completion')
  }
}

/**
 * Reject task completion (admin only)
 */
export const rejectTaskCompletion = async (
  completionId: string,
  adminId: string,
  adminName: string,
  reason?: string
): Promise<void> => {
  try {
    const completionRef = doc(db, COLLECTIONS.TASK_COMPLETIONS, completionId)
    await updateDoc(completionRef, {
      status: 'rejected',
      approvedBy: adminId,
      approvedByName: adminName,
      approvedAt: serverTimestamp(),
      rejectionReason: reason || 'No reason provided',
    })
  } catch (error) {
    console.error('Error rejecting task completion:', error)
    throw new Error('Failed to reject task completion')
  }
}

/**
 * Award points to a group member (admin only)
 */
export const awardPointsToMember = async (
  groupId: string,
  memberId: string,
  adminId: string,
  adminName: string,
  points: number,
  taskId?: string,
  taskTitle?: string
): Promise<void> => {
  try {
    if (points <= 0) {
      throw new Error('Points must be greater than 0')
    }

    // Use transaction to ensure all updates happen atomically
    await runTransaction(db, async (transaction) => {
      // Update user's total points
      const userRef = doc(db, COLLECTIONS.USERS, memberId)
      transaction.update(userRef, {
        currentPoints: increment(points),
        totalEarned: increment(points),
        updatedAt: serverTimestamp(),
      })

      // Update group member points
      const membersRef = collection(db, COLLECTIONS.GROUP_MEMBERS)
      const memberQuery = query(
        membersRef,
        where('groupId', '==', groupId),
        where('userId', '==', memberId)
      )
      const memberSnapshot = await getDocs(memberQuery)
      
      if (!memberSnapshot.empty) {
        const memberDoc = memberSnapshot.docs[0]
        transaction.update(memberDoc.ref, {
          pointsEarned: increment(points),
        })
      }

      // Create transaction record
      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS)
      let description = `Points awarded by admin: ${adminName}`
      if (taskTitle) {
        description = `Task completed: ${taskTitle} (awarded by ${adminName})`
      }
      
      const transactionData = {
        userId: memberId,
        type: 'earn',
        amount: points,
        description,
        createdAt: serverTimestamp(),
      }
      const newTransactionRef = doc(transactionsRef)
      transaction.set(newTransactionRef, transactionData)

      // If taskId is provided, create a special admin-approved task completion record
      if (taskId) {
        const completionsRef = collection(db, COLLECTIONS.TASK_COMPLETIONS)
        const completionData = {
          taskId,
          groupId,
          userId: memberId,
          userName: '', // Will be filled from member data
          completedAt: serverTimestamp(),
          pointsAwarded: points,
          status: 'approved',
          approvedBy: adminId,
          approvedByName: adminName,
          approvedAt: serverTimestamp(),
        }
        const newCompletionRef = doc(completionsRef)
        transaction.set(newCompletionRef, completionData)
      }
    })
  } catch (error) {
    console.error('Error awarding points to member:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to award points to member')
  }
}