import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import groupSlice from './slices/groupSlice'
import taskSlice from './slices/taskSlice'
import transactionSlice from './slices/transactionSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    groups: groupSlice,
    tasks: taskSlice,
    transactions: transactionSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setUser', 'auth/setUserProfile'],
        ignoredPaths: ['auth.user', 'auth.userProfile.createdAt', 'auth.userProfile.updatedAt'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch