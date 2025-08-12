'use client'

import React, { useState } from 'react'
import { Modal, Button, Input, Alert } from '@/components/ui'
import { useForm } from '@/hooks/useForm'
import { useAuth } from '@/contexts/AuthContext'
import { updateUserProfile, changeUserPassword } from '@/lib/auth'
import { updateUsernameAcrossDatabase } from '@/lib/firestore'
import { validatePassword } from '@/lib/utils'

interface ProfileSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface UpdateProfileFormData {
  displayName: string
}

interface ChangePasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, userProfile, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [success, setSuccess] = useState<string | null>(null)

  const clearMessages = () => {
    setTimeout(() => {
      setSuccess(null)
    }, 3000)
  }

  // Profile update form
  const profileForm = useForm<UpdateProfileFormData>({
    initialValues: {
      displayName: userProfile?.name || user?.displayName || '',
    },
    validate: (values) => {
      const errors: { [key: string]: string } = {}
      
      if (!values.displayName.trim()) {
        errors.displayName = 'Display name is required'
      } else if (values.displayName.trim().length < 2) {
        errors.displayName = 'Display name must be at least 2 characters'
      }
      
      return errors
    },
    onSubmit: async (values) => {
      if (!user) {
        profileForm.setFieldError('general', 'No user found')
        return
      }

      try {
        const newDisplayName = values.displayName.trim()
        
        // Update Firebase Auth profile
        const { error: authError } = await updateUserProfile(user, newDisplayName)
        if (authError) {
          profileForm.setFieldError('general', authError)
          return
        }
        
        // Update username across all related documents in Firestore
        await updateUsernameAcrossDatabase(user.uid, newDisplayName)
        
        // Refresh user profile in context
        await refreshProfile()
        
        setSuccess('Profile updated successfully!')
        clearMessages()
      } catch (error) {
        console.error('Profile update error:', error)
        profileForm.setFieldError('general', 'Failed to update profile. Please try again.')
      }
    },
  })

  // Password change form
  const passwordForm = useForm<ChangePasswordFormData>({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: (values) => {
      const errors: { [key: string]: string } = {}
      
      if (!values.currentPassword) {
        errors.currentPassword = 'Current password is required'
      }
      
      if (!values.newPassword) {
        errors.newPassword = 'New password is required'
      } else if (!validatePassword(values.newPassword)) {
        errors.newPassword = 'Password must be at least 6 characters'
      }
      
      if (!values.confirmPassword) {
        errors.confirmPassword = 'Please confirm your new password'
      } else if (values.newPassword !== values.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
      }
      
      if (values.currentPassword && values.newPassword && values.currentPassword === values.newPassword) {
        errors.newPassword = 'New password must be different from current password'
      }
      
      return errors
    },
    onSubmit: async (values) => {
      if (!user) {
        passwordForm.setFieldError('general', 'No user found')
        return
      }

      try {
        const { error } = await changeUserPassword(
          user,
          values.currentPassword,
          values.newPassword
        )
        
        if (error) {
          // Handle specific error types
          if (error.includes('Invalid email or password') || 
              error.includes('wrong-password') || 
              error.includes('invalid-credential')) {
            passwordForm.setFieldError('currentPassword', 'Current password is incorrect')
          } else if (error.includes('Password should be at least 6 characters') || 
                     error.includes('weak-password')) {
            passwordForm.setFieldError('newPassword', 'New password is too weak. Must be at least 6 characters.')
          } else if (error.includes('Please log out and log back in')) {
            passwordForm.setFieldError('general', 'Please log out and log back in, then try again')
          } else if (error.includes('Too many failed')) {
            passwordForm.setFieldError('general', 'Too many attempts. Please wait a few minutes and try again.')
          } else {
            passwordForm.setFieldError('general', error)
          }
          return
        }
        
        setSuccess('Password changed successfully!')
        passwordForm.resetForm()
        clearMessages()
      } catch (error) {
        console.error('Password change error:', error)
        passwordForm.setFieldError('general', 'Failed to change password. Please try again.')
      }
    },
  })

  const handleClose = () => {
    profileForm.resetForm()
    passwordForm.resetForm()
    setSuccess(null)
    setActiveTab('profile')
    onClose()
  }

  const isGoogleUser = user?.providerData?.some(provider => provider.providerId === 'google.com')

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Profile Settings"
      size="md"
      footer={
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={
              activeTab === 'profile' 
                ? profileForm.isSubmitting 
                : passwordForm.isSubmitting
            }
            onClick={
              activeTab === 'profile' 
                ? profileForm.handleSubmit 
                : passwordForm.handleSubmit
            }
          >
            {activeTab === 'profile' ? 'Update Profile' : 'Change Password'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {success && (
          <Alert variant="success">
            {success}
          </Alert>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            Update Profile
          </button>
          <button
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'password'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('password')}
            disabled={isGoogleUser}
          >
            Change Password
          </button>
        </div>

        {/* Profile Update Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {profileForm.errors.general && (
              <Alert variant="error">
                {profileForm.errors.general}
              </Alert>
            )}

            <Input
              label="Display Name"
              value={profileForm.values.displayName}
              onChange={profileForm.handleChange('displayName')}
              error={profileForm.errors.displayName}
              placeholder="Enter your display name"
              required
            />

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Current Information:
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Current Name:</strong> {userProfile?.name || 'Not set'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Password Change Tab */}
        {activeTab === 'password' && (
          <div className="space-y-4">
            {isGoogleUser ? (
              <Alert variant="info">
                You signed in with Google. Password changes are not available for Google accounts.
              </Alert>
            ) : (
              <>
                {passwordForm.errors.general && (
                  <Alert variant="error">
                    {passwordForm.errors.general}
                  </Alert>
                )}

                <Input
                  label="Current Password"
                  type="password"
                  value={passwordForm.values.currentPassword}
                  onChange={passwordForm.handleChange('currentPassword')}
                  error={passwordForm.errors.currentPassword}
                  placeholder="Enter your current password"
                  required
                />

                <Input
                  label="New Password"
                  type="password"
                  value={passwordForm.values.newPassword}
                  onChange={passwordForm.handleChange('newPassword')}
                  error={passwordForm.errors.newPassword}
                  placeholder="Enter your new password"
                  required
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordForm.values.confirmPassword}
                  onChange={passwordForm.handleChange('confirmPassword')}
                  error={passwordForm.errors.confirmPassword}
                  placeholder="Confirm your new password"
                  required
                />

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">
                    Password Requirements:
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• At least 6 characters long</li>
                    <li>• Different from your current password</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ProfileSettingsModal