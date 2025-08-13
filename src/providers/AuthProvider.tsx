'use client'

import React, { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  useEffect(() => {
    const cleanup = initializeAuth()
    return cleanup
  }, [initializeAuth])

  return <>{children}</>
}