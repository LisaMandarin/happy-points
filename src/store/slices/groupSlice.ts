import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Group, GroupMember, GroupInvitation, GroupJoinRequest } from '@/types'

interface GroupState {
  groups: Group[]
  currentGroup: Group | null
  groupMembers: GroupMember[]
  groupInvitations: GroupInvitation[]
  joinRequests: GroupJoinRequest[]
  loading: boolean
  error: string | null
}

const initialState: GroupState = {
  groups: [],
  currentGroup: null,
  groupMembers: [],
  groupInvitations: [],
  joinRequests: [],
  loading: false,
  error: null,
}

const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setGroups: (state, action: PayloadAction<Group[]>) => {
      state.groups = action.payload
    },
    setCurrentGroup: (state, action: PayloadAction<Group | null>) => {
      state.currentGroup = action.payload
    },
    setGroupMembers: (state, action: PayloadAction<GroupMember[]>) => {
      state.groupMembers = action.payload
    },
    setGroupInvitations: (state, action: PayloadAction<GroupInvitation[]>) => {
      state.groupInvitations = action.payload
    },
    setJoinRequests: (state, action: PayloadAction<GroupJoinRequest[]>) => {
      state.joinRequests = action.payload
    },
    addGroup: (state, action: PayloadAction<Group>) => {
      state.groups.push(action.payload)
    },
    updateGroup: (state, action: PayloadAction<Group>) => {
      const index = state.groups.findIndex(group => group.id === action.payload.id)
      if (index !== -1) {
        state.groups[index] = action.payload
      }
      if (state.currentGroup?.id === action.payload.id) {
        state.currentGroup = action.payload
      }
    },
    removeGroup: (state, action: PayloadAction<string>) => {
      state.groups = state.groups.filter(group => group.id !== action.payload)
      if (state.currentGroup?.id === action.payload) {
        state.currentGroup = null
      }
    },
    addGroupMember: (state, action: PayloadAction<GroupMember>) => {
      state.groupMembers.push(action.payload)
    },
    updateGroupMember: (state, action: PayloadAction<GroupMember>) => {
      const index = state.groupMembers.findIndex(member => member.id === action.payload.id)
      if (index !== -1) {
        state.groupMembers[index] = action.payload
      }
    },
    removeGroupMember: (state, action: PayloadAction<string>) => {
      state.groupMembers = state.groupMembers.filter(member => member.id !== action.payload)
    },
    updateInvitation: (state, action: PayloadAction<GroupInvitation>) => {
      const index = state.groupInvitations.findIndex(inv => inv.id === action.payload.id)
      if (index !== -1) {
        state.groupInvitations[index] = action.payload
      }
    },
    updateJoinRequest: (state, action: PayloadAction<GroupJoinRequest>) => {
      const index = state.joinRequests.findIndex(req => req.id === action.payload.id)
      if (index !== -1) {
        state.joinRequests[index] = action.payload
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearGroups: (state) => {
      state.groups = []
      state.currentGroup = null
      state.groupMembers = []
      state.groupInvitations = []
      state.joinRequests = []
      state.loading = false
      state.error = null
    },
  },
})

export const {
  setGroups,
  setCurrentGroup,
  setGroupMembers,
  setGroupInvitations,
  setJoinRequests,
  addGroup,
  updateGroup,
  removeGroup,
  addGroupMember,
  updateGroupMember,
  removeGroupMember,
  updateInvitation,
  updateJoinRequest,
  setLoading,
  setError,
  clearGroups,
} = groupSlice.actions

export default groupSlice.reducer