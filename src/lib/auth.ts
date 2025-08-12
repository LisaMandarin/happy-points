import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { createUserProfile, getUserProfile } from '@/lib/firestore'
import { AuthResult, CreateUserProfileData } from '@/types'
import { getAuthErrorMessage } from '@/lib/utils'
import { ERROR_MESSAGES } from '@/lib/constants'

// Auth providers
export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('profile')
googleProvider.addScope('email')

/**
 * Helper function to ensure user profile exists in Firestore
 */
const ensureUserProfile = async (user: User): Promise<void> => {
  try {
    const existingProfile = await getUserProfile(user.uid)
    
    if (!existingProfile) {
      const profileData: CreateUserProfileData = {
        email: user.email || '',
        name: user.displayName || 'User',
      }
      
      await createUserProfile(user.uid, profileData)
    }
  } catch (error) {
    console.warn('Failed to ensure user profile exists:', error)
    // Non-blocking - user can still authenticate
  }
}

/**
 * Sign up a new user with email and password
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string
): Promise<AuthResult> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    const profileData: CreateUserProfileData = {
      email: user.email || email,
      name: name.trim(),
    }

    try {
      await createUserProfile(user.uid, profileData)
    } catch (firestoreError) {
      console.warn('Failed to create user profile in Firestore:', firestoreError)
      // Continue - profile will be created on next login
    }

    return { user, error: null }
  } catch (error: any) {
    return {
      user: null,
      error: getAuthErrorMessage(error),
    }
  }
}

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return { user: userCredential.user, error: null }
  } catch (error: any) {
    return {
      user: null,
      error: getAuthErrorMessage(error),
    }
  }
}

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user
    
    await ensureUserProfile(user)
    
    return { user, error: null }
  } catch (error: any) {
    return {
      user: null,
      error: getAuthErrorMessage(error),
    }
  }
}


/**
 * Sign out current user
 */
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    await firebaseSignOut(auth)
    return { error: null }
  } catch (error: any) {
    return { error: getAuthErrorMessage(error) }
  }
}

/**
 * Auth state observer
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback)
}

/**
 * Update user profile (display name)
 */
export const updateUserProfile = async (
  user: User,
  displayName: string
): Promise<{ error: string | null }> => {
  try {
    await updateProfile(user, { displayName })
    return { error: null }
  } catch (error: any) {
    return { error: getAuthErrorMessage(error) }
  }
}

/**
 * Change user password
 */
export const changeUserPassword = async (
  user: User,
  currentPassword: string,
  newPassword: string
): Promise<{ error: string | null }> => {
  try {
    // Re-authenticate user before changing password
    if (!user.email) {
      return { error: 'Unable to change password for this account type' }
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    
    // Update password
    await updatePassword(user, newPassword)
    return { error: null }
  } catch (error: any) {
    return { error: getAuthErrorMessage(error) }
  }
}