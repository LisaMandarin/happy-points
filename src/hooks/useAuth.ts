import { useAuthStore } from '@/stores/authStore'
import { AuthContextType } from '@/types'

export const useAuth = (): AuthContextType => {
  const user = useAuthStore((state) => state.user)
  const userProfile = useAuthStore((state) => state.userProfile)
  const loading = useAuthStore((state) => state.loading)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)

  const refreshProfileHandler = async (): Promise<void> => {
    if (user) {
      await refreshProfile(user.uid)
    }
  }

  return {
    user,
    userProfile,
    loading,
    refreshProfile: refreshProfileHandler,
  }
}