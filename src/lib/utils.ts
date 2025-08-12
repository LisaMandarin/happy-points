import { Timestamp } from 'firebase/firestore'
import { AuthError, FormErrors, AUTH_ERRORS } from '@/types'
import { ERROR_MESSAGES } from '@/lib/constants'

// Date utilities
export const formatDate = (date: Date | Timestamp): string => {
  const dateObj = date instanceof Timestamp ? date.toDate() : date
  return dateObj.toLocaleDateString()
}

export const formatDateTime = (date: Date | Timestamp): string => {
  const dateObj = date instanceof Timestamp ? date.toDate() : date
  return dateObj.toLocaleString()
}

export const getTimeAgo = (date: Date | Timestamp): string => {
  const dateObj = date instanceof Timestamp ? date.toDate() : date
  const now = new Date()
  const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} hours ago`
  } else if (diffInHours < 168) { // 7 days
    return `${Math.floor(diffInHours / 24)} days ago`
  } else {
    return formatDate(dateObj)
  }
}

// Number utilities
export const formatPoints = (points: number): string => {
  return points.toLocaleString()
}

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): boolean => {
  return password.length >= 6
}

// Form validation
export const validateLoginForm = (email: string, password: string): FormErrors => {
  const errors: FormErrors = {}

  if (!email) {
    errors.email = ERROR_MESSAGES.FORM.REQUIRED_FIELD('Email')
  } else if (!validateEmail(email)) {
    errors.email = ERROR_MESSAGES.FORM.INVALID_EMAIL
  }

  if (!password) {
    errors.password = ERROR_MESSAGES.FORM.REQUIRED_FIELD('Password')
  }

  return errors
}

export const validateRegisterForm = (
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): FormErrors => {
  const errors: FormErrors = {}

  if (!name.trim()) {
    errors.name = ERROR_MESSAGES.FORM.REQUIRED_FIELD('Name')
  }

  if (!email) {
    errors.email = ERROR_MESSAGES.FORM.REQUIRED_FIELD('Email')
  } else if (!validateEmail(email)) {
    errors.email = ERROR_MESSAGES.FORM.INVALID_EMAIL
  }

  if (!password) {
    errors.password = ERROR_MESSAGES.FORM.REQUIRED_FIELD('Password')
  } else if (!validatePassword(password)) {
    errors.password = ERROR_MESSAGES.FORM.PASSWORD_LENGTH
  }

  if (!confirmPassword) {
    errors.confirmPassword = ERROR_MESSAGES.FORM.REQUIRED_FIELD('Confirm Password')
  } else if (password !== confirmPassword) {
    errors.confirmPassword = ERROR_MESSAGES.FORM.PASSWORD_MISMATCH
  }

  return errors
}

// Error handling utilities
export const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    case AUTH_ERRORS.POPUP_CLOSED:
      return ERROR_MESSAGES.AUTH.POPUP_CLOSED
    case AUTH_ERRORS.POPUP_BLOCKED:
      return ERROR_MESSAGES.AUTH.POPUP_BLOCKED
    case AUTH_ERRORS.USER_NOT_FOUND:
    case AUTH_ERRORS.WRONG_PASSWORD:
    case AUTH_ERRORS.INVALID_CREDENTIAL:
      return ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS
    case AUTH_ERRORS.INVALID_EMAIL:
      return ERROR_MESSAGES.AUTH.INVALID_EMAIL
    case AUTH_ERRORS.USER_DISABLED:
      return ERROR_MESSAGES.AUTH.USER_DISABLED
    case AUTH_ERRORS.TOO_MANY_REQUESTS:
      return ERROR_MESSAGES.AUTH.TOO_MANY_REQUESTS
    case AUTH_ERRORS.NETWORK_REQUEST_FAILED:
      return ERROR_MESSAGES.AUTH.NETWORK_ERROR
    case AUTH_ERRORS.EMAIL_IN_USE:
      return ERROR_MESSAGES.AUTH.EMAIL_IN_USE
    case AUTH_ERRORS.WEAK_PASSWORD:
      return ERROR_MESSAGES.AUTH.WEAK_PASSWORD
    case AUTH_ERRORS.OPERATION_NOT_ALLOWED:
      return ERROR_MESSAGES.AUTH.OPERATION_NOT_ALLOWED
    case AUTH_ERRORS.REQUIRES_RECENT_LOGIN:
      return ERROR_MESSAGES.AUTH.REQUIRES_RECENT_LOGIN
    default:
      console.log('Unhandled auth error:', error.code, error.message)
      return ERROR_MESSAGES.AUTH.GENERAL
  }
}

// Loading state utilities
export const createLoadingState = () => ({
  isLoading: false,
  error: null as string | null,
  setLoading: (loading: boolean) => ({ isLoading: loading }),
  setError: (error: string | null) => ({ error }),
  reset: () => ({ isLoading: false, error: null }),
})

// Local storage utilities
export const storage = {
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Silent fail
    }
  },
  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Silent fail
    }
  },
}

// Group utilities
export const generateInvitationLink = (invitationCode: string): string => {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  return `${baseUrl}/invite/${invitationCode}`
}