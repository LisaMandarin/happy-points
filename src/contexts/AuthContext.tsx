'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from 'firebase/auth'
import { onAuthStateChange } from '@/lib/auth'
import { getUserProfile, createUserProfile } from '@/lib/firestore'
import { AuthContextType, UserProfile, CreateUserProfileData } from '@/types'

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  refreshProfile: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!user) return
    
    try {
      const profile = await getUserProfile(user.uid)
      setUserProfile(profile)
    } catch (error) {
      console.error('Error refreshing user profile:', error)
    }
  }, [user])

  const ensureUserProfile = useCallback(async (user: User): Promise<UserProfile | null> => {
    try {
      let profile = await getUserProfile(user.uid)
      
      if (!profile) {
        const profileData: CreateUserProfileData = {
          email: user.email || '',
          name: user.displayName || 'User',
        }
        
        await createUserProfile(user.uid, profileData)
        profile = await getUserProfile(user.uid)
      }
      
      return profile
    } catch (error) {
      console.error('Error ensuring user profile:', error)
      
      // Return a fallback profile
      return {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || 'User',
        currentPoints: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user)
      
      if (user) {
        const profile = await ensureUserProfile(user)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [ensureUserProfile])

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}