import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { User } from 'firebase/auth'
import { UserProfile, CreateUserProfileData } from '@/types'
import { getUserProfile, createUserProfile } from '@/lib/firestore'

interface AuthState {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  userProfile: null,
  loading: true,
  error: null,
}

export const refreshProfile = createAsyncThunk(
  'auth/refreshProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const profile = await getUserProfile(userId)
      return profile
    } catch (error) {
      console.error('Error refreshing user profile:', error)
      return rejectWithValue('Failed to refresh profile')
    }
  }
)

export const ensureUserProfile = createAsyncThunk(
  'auth/ensureUserProfile',
  async (user: User, { rejectWithValue }) => {
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
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      if (!action.payload) {
        state.userProfile = null
      }
    },
    setUserProfile: (state, action: PayloadAction<UserProfile | null>) => {
      state.userProfile = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearAuth: (state) => {
      state.user = null
      state.userProfile = null
      state.loading = false
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshProfile.pending, (state) => {
        state.error = null
      })
      .addCase(refreshProfile.fulfilled, (state, action) => {
        if (action.payload) {
          state.userProfile = action.payload
        }
      })
      .addCase(refreshProfile.rejected, (state, action) => {
        state.error = action.payload as string
      })
      .addCase(ensureUserProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(ensureUserProfile.fulfilled, (state, action) => {
        state.userProfile = action.payload
        state.loading = false
      })
      .addCase(ensureUserProfile.rejected, (state, action) => {
        state.error = action.payload as string
        state.loading = false
      })
  },
})

export const { setUser, setUserProfile, setLoading, setError, clearAuth } = authSlice.actions
export default authSlice.reducer