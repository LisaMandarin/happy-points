// Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  GROUPS: 'groups',
  GROUP_MEMBERS: 'groupMembers',
  GROUP_INVITATIONS: 'groupInvitations',
  GROUP_JOIN_REQUESTS: 'groupJoinRequests',
  GROUP_TASKS: 'groupTasks',
  TASK_COMPLETIONS: 'taskCompletions',
  NOTIFICATIONS: 'notifications',
  ACTIVITIES: 'activities',
  TEST: 'test',
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  GROUPS: '/groups',
  GROUP_DETAIL: '/groups/[id]',
  ACCEPT_INVITATION: '/invite/[code]',
} as const

// Default Values
export const DEFAULT_VALUES = {
  POINTS: {
    INITIAL: 0,
    DAILY_BONUS: 50,
  },
  PAGINATION: {
    DEFAULT_LIMIT: 10,
    TRANSACTIONS_LIMIT: 5,
    GROUPS_LIMIT: 10,
    MEMBERS_LIMIT: 20,
  },
  GROUP: {
    MIN_MEMBERS: 2,
    MAX_MEMBERS: 50,
    DEFAULT_MAX_MEMBERS: 10,
    CODE_LENGTH: 6,
    INVITATION_EXPIRY_DAYS: 7,
  },
} as const

// Error Messages
export const ERROR_MESSAGES = {
  AUTH: {
    POPUP_CLOSED: 'Sign-in cancelled. Please try again.',
    POPUP_BLOCKED: 'Popup blocked. Please allow popups and try again.',
    INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
    INVALID_EMAIL: 'Invalid email address format.',
    USER_DISABLED: 'This account has been disabled. Please contact support.',
    TOO_MANY_REQUESTS: 'Too many failed login attempts. Please try again later.',
    NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
    EMAIL_IN_USE: 'An account with this email already exists.',
    WEAK_PASSWORD: 'Password should be at least 6 characters.',
    OPERATION_NOT_ALLOWED: 'This operation is not allowed. Please contact support.',
    REQUIRES_RECENT_LOGIN: 'Please log out and log back in to continue.',
    WRONG_CURRENT_PASSWORD: 'Current password is incorrect. Please check and try again.',
    GENERAL: 'Login failed. Please try again.',
  },
  FORM: {
    REQUIRED_FIELD: (field: string) => `${field} is required`,
    INVALID_EMAIL: 'Please enter a valid email address',
    PASSWORD_MISMATCH: 'Passwords do not match',
    PASSWORD_LENGTH: 'Password must be at least 6 characters',
  },
  FIRESTORE: {
    CREATE_PROFILE_FAILED: 'Failed to create user profile',
    FETCH_PROFILE_FAILED: 'Failed to fetch user profile',
    UPDATE_PROFILE_FAILED: 'Failed to update user profile',
    TRANSACTION_FAILED: 'Failed to process transaction',
    INSUFFICIENT_POINTS: 'Insufficient points for this transaction',
  },
  GROUP: {
    CREATE_FAILED: 'Failed to create group',
    JOIN_FAILED: 'Failed to join group',
    INVALID_CODE: 'Invalid group code',
    GROUP_NOT_FOUND: 'Group not found',
    GROUP_FULL: 'Group is full',
    ALREADY_MEMBER: 'You are already a member of this group',
    NOT_ADMIN: 'Only group admin can perform this action',
    INVITE_FAILED: 'Failed to send invitation',
    INVALID_INVITATION: 'Invalid or expired invitation',
    INVITATION_EXPIRED: 'Invitation has expired',
    INVITATION_ALREADY_USED: 'Invitation has already been used',
  },
  TASK: {
    CREATE_FAILED: 'Failed to create task',
    UPDATE_FAILED: 'Failed to update task',
    DELETE_FAILED: 'Failed to delete task',
    NOT_FOUND: 'Task not found',
    ALREADY_COMPLETED: 'Task has already been completed',
    NOT_ACTIVE: 'Task is not active',
    INVALID_POINTS: 'Points must be a positive number',
  },
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  AUTH: {
    SIGNUP_SUCCESS: 'Account created successfully!',
    SIGNIN_SUCCESS: 'Welcome back!',
    SIGNOUT_SUCCESS: 'Signed out successfully',
  },
  POINTS: {
    EARNED: (amount: number) => `You earned ${amount} points!`,
    REDEEMED: (amount: number) => `You redeemed ${amount} points!`,
  },
  GROUP: {
    CREATED: 'Group created successfully!',
    JOINED: 'Successfully joined the group!',
    INVITATION_SENT: 'Invitations sent successfully!',
    INVITATION_ACCEPTED: 'Invitation accepted! Welcome to the group!',
    MEMBER_REMOVED: 'Member removed successfully',
    GROUP_DELETED: 'Group deleted successfully',
  },
  TASK: {
    CREATED: 'Task created successfully!',
    UPDATED: 'Task updated successfully!',
    DELETED: 'Task deleted successfully!',
    COMPLETED: 'Task completed successfully!',
    APPROVED: 'Task completion approved!',
    REJECTED: 'Task completion rejected.',
  },
} as const