import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { refreshProfile } from '@/store/slices/authSlice'
import { AuthContextType } from '@/types'

export const useAuth = (): AuthContextType => {
  const dispatch = useAppDispatch()
  const { user, userProfile, loading } = useAppSelector((state) => state.auth)

  const refreshProfileHandler = async (): Promise<void> => {
    if (user) {
      await dispatch(refreshProfile(user.uid))
    }
  }

  return {
    user,
    userProfile,
    loading,
    refreshProfile: refreshProfileHandler,
  }
}