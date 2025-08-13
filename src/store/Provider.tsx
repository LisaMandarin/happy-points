'use client'

import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import { store } from './index'
import { useAppDispatch } from './hooks'
import { setUser, setLoading, ensureUserProfile } from './slices/authSlice'
import { onAuthStateChange } from '@/lib/auth'

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      dispatch(setUser(user))
      
      if (user) {
        dispatch(ensureUserProfile(user))
      } else {
        dispatch(setLoading(false))
      }
    })

    return () => unsubscribe()
  }, [dispatch])

  return <>{children}</>
}

export const ReduxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Provider store={store}>
      <AuthInitializer>
        {children}
      </AuthInitializer>
    </Provider>
  )
}