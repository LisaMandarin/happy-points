import { User as FirebaseUser } from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'

// Auth Types
export interface AuthUser extends FirebaseUser {}

export interface AuthResult {
  user: FirebaseUser | null
  error: string | null
}

export interface AuthError {
  code: string
  message: string
}

// User Profile Types
export interface UserProfile {
  id: string
  email: string
  name: string
  currentPoints: number
  totalEarned: number
  totalRedeemed: number
  createdAt: Date | Timestamp
  updatedAt: Date | Timestamp
}

export interface CreateUserProfileData {
  email: string
  name: string
}

// Points & Transactions Types
export type TransactionType = 'earn' | 'redeem' | 'penalty'

export interface PointsTransaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  description: string
  createdAt: Date | Timestamp
}

export interface CreateTransactionData {
  userId: string
  type: TransactionType
  amount: number
  description: string
}

export interface GroupPenalty {
  id: string
  groupId: string
  groupName: string
  adminId: string
  adminName: string
  memberId: string
  memberName: string
  title: string
  description: string
  amount: number
  createdAt: Date | Timestamp
}

export interface CreatePenaltyData {
  groupId: string
  groupName: string
  adminId: string
  adminName: string
  memberId: string
  memberName: string
  title: string
  description: string
  amount: number
}

export interface GroupPenaltyType {
  id: string
  groupId: string
  groupName: string
  title: string
  description: string
  amount: number
  isActive: boolean
  createdAt: Date | Timestamp
  createdBy: string
  createdByName: string
}

export interface CreatePenaltyTypeData {
  groupId: string
  groupName: string
  title: string
  description: string
  amount: number
  createdBy: string
  createdByName: string
}

export interface UpdatePenaltyTypeData {
  isActive?: boolean
  title?: string
  description?: string
  amount?: number
}

export interface PenaltyFormData {
  memberId: string
  title: string
  description: string
  amount: string
  general?: string
}

// Form Types
export interface LoginFormData {
  email: string
  password: string
  general?: string
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface FormErrors {
  [key: string]: string
}

// Component Props Types
export interface AuthContextType {
  user: FirebaseUser | null
  userProfile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Group Types
export type GroupRole = 'admin' | 'member'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface Group {
  id: string
  name: string
  description: string
  code: string
  adminId: string
  adminName: string
  memberCount: number
  maxMembers: number
  // isPrivate: boolean
  createdAt: Date | Timestamp
  updatedAt: Date | Timestamp
  isUserActive?: boolean  // Added to track if current user is active in this group
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  userName: string
  userEmail: string
  role: GroupRole
  joinedAt: Date | Timestamp
  pointsEarned: number
  pointsRedeemed: number
  isActive: boolean
  deactivatedAt?: Date | Timestamp
  deactivatedBy?: string
  reactivatedAt?: Date | Timestamp
  reactivatedBy?: string
}

export interface GroupInvitation {
  id: string
  groupId: string
  groupName: string
  adminId: string
  adminName: string
  inviteeEmail: string
  inviteeUserId?: string
  status: InvitationStatus
  invitationCode: string
  expiresAt: Date | Timestamp
  createdAt: Date | Timestamp
  acceptedAt?: Date | Timestamp
}


export interface CreateGroupData {
  name: string
  description: string
  maxMembers: number
  // isPrivate: boolean
}


export interface InviteToGroupData {
  groupId: string
  emails: string[]
  adminId: string
}

// Group Form Types
export interface CreateGroupFormData {
  name: string
  description: string
  maxMembers: number
  // isPrivate: boolean
}


export interface InviteUsersFormData {
  emails: string
  general?: string
}

// Constants
export const TRANSACTION_TYPES = {
  EARN: 'earn' as const,
  REDEEM: 'redeem' as const,
  PENALTY: 'penalty' as const,
} as const

export const GROUP_ROLES = {
  ADMIN: 'admin' as const,
  MEMBER: 'member' as const,
} as const

export const INVITATION_STATUS = {
  PENDING: 'pending' as const,
  ACCEPTED: 'accepted' as const,
  DECLINED: 'declined' as const,
  EXPIRED: 'expired' as const,
} as const

// Task types
export interface GroupTask {
  id: string
  groupId: string
  title: string
  description: string
  points: number
  isActive: boolean
  createdBy: string
  createdByName: string
  createdAt: Date | Timestamp
  updatedAt: Date | Timestamp
}

export interface TaskCompletion {
  id: string
  taskId: string
  groupId: string
  userId: string
  userName: string
  completedAt: Date | Timestamp
  pointsAwarded: number
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedByName?: string
  approvedAt?: Date | Timestamp
  rejectionReason?: string
}

export interface CreateTaskData {
  title: string
  description: string
  points: number
}

export interface UpdateTaskData {
  title?: string
  description?: string
  points?: number
  isActive?: boolean
}

export interface TaskFormData {
  title: string
  description: string
  points: string
  general?: string
}

export const AUTH_ERRORS = {
  POPUP_CLOSED: 'auth/popup-closed-by-user',
  POPUP_BLOCKED: 'auth/popup-blocked',
  USER_NOT_FOUND: 'auth/user-not-found',
  WRONG_PASSWORD: 'auth/wrong-password',
  INVALID_CREDENTIAL: 'auth/invalid-credential',
  INVALID_EMAIL: 'auth/invalid-email',
  USER_DISABLED: 'auth/user-disabled',
  TOO_MANY_REQUESTS: 'auth/too-many-requests',
  NETWORK_REQUEST_FAILED: 'auth/network-request-failed',
  EMAIL_IN_USE: 'auth/email-already-in-use',
  WEAK_PASSWORD: 'auth/weak-password',
  OPERATION_NOT_ALLOWED: 'auth/operation-not-allowed',
  REQUIRES_RECENT_LOGIN: 'auth/requires-recent-login',
} as const