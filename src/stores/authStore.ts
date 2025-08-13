import { create } from 'zustand'
import { User } from 'firebase/auth'
import { UserProfile, CreateUserProfileData } from '@/types'
import { getUserProfile, createUserProfile } from '@/lib/firestore'
import { onAuthStateChange } from '@/lib/auth'

interface AuthState {
  // State
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setUserProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearAuth: () => void
  ensureUserProfile: (user: User) => Promise<void>
  refreshProfile: (userId: string) => Promise<void>
  
  // Auth state listener
  initializeAuth: () => () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  userProfile: null,
  loading: true,
  error: null,

  // Actions
  setUser: (user) => {
    set({ user })
    if (!user) {
      set({ userProfile: null })
    }
  },

  setUserProfile: (userProfile) => set({ userProfile }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearAuth: () => set({ 
    user: null, 
    userProfile: null, 
    loading: false, 
    error: null 
  }),

  ensureUserProfile: async (user) => {
    try {
      set({ loading: true, error: null })
      
      let profile = await getUserProfile(user.uid)
      
      if (!profile) {
        const profileData: CreateUserProfileData = {
          email: user.email || '',
          name: user.displayName || 'User',
        }
        
        await createUserProfile(user.uid, profileData)
        profile = await getUserProfile(user.uid)
      }
      
      if (profile) {
        set({ userProfile: profile, loading: false })
      } else {
        // Fallback profile
        const now = new Date().toISOString()
        const fallbackProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          name: user.displayName || 'User',
          currentPoints: 0,
          totalEarned: 0,
          totalRedeemed: 0,
          createdAt: now,
          updatedAt: now
        }
        set({ userProfile: fallbackProfile, loading: false })
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
      
      // Set fallback profile even on error
      const now = new Date().toISOString()
      const fallbackProfile: UserProfile = {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || 'User',
        currentPoints: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        createdAt: now,
        updatedAt: now
      }
      
      set({ 
        userProfile: fallbackProfile, 
        loading: false, 
        error: 'Failed to load profile' 
      })
    }
  },

  refreshProfile: async (userId) => {
    try {
      set({ error: null })
      const profile = await getUserProfile(userId)
      if (profile) {
        set({ userProfile: profile })
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error)
      set({ error: 'Failed to refresh profile' })
    }
  },

  initializeAuth: () => {
    const { setUser, setLoading, ensureUserProfile } = get()
    
    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user)
      
      if (user) {
        try {
          await ensureUserProfile(user)
        } catch (error) {
          console.error('Auth initialization error:', error)
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    })

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 10000)

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }
}))