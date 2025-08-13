'use client'

import React, { useState } from 'react'
import { Modal, Button, Input, Alert, Badge } from '@/components/ui'
import { useForm } from '@/hooks/useForm'
import { InviteUsersFormData, GroupInvitation } from '@/types'
import { validateEmail, generateInvitationLink } from '@/lib/utils'
import { getUserByEmail } from '@/lib/firestore'

interface InviteUsersModalProps {
  isOpen: boolean
  onClose: () => void
  onInviteUsers: (emails: string[]) => Promise<GroupInvitation[]>
  groupName: string
  currentUserEmail?: string
}

const InviteUsersModal: React.FC<InviteUsersModalProps> = ({
  isOpen,
  onClose,
  onInviteUsers,
  groupName,
  currentUserEmail
}) => {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([])
  const [showInvitations, setShowInvitations] = useState(false)
  const [emailAccountStatus, setEmailAccountStatus] = useState<Record<string, boolean>>({})

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm,
    setFieldError,
  } = useForm<InviteUsersFormData>({
    initialValues: {
      emails: '',
    },
    validate: (values) => {
      const errors: { [key: string]: string } = {}
      
      if (!values.emails.trim()) {
        errors.emails = 'Please enter at least one email address'
        return errors
      }

      const emailList = values.emails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0)

      if (emailList.length === 0) {
        errors.emails = 'Please enter at least one email address'
        return errors
      }

      const invalidEmails = emailList.filter(email => !validateEmail(email))
      if (invalidEmails.length > 0) {
        errors.emails = `Invalid email addresses: ${invalidEmails.join(', ')}`
      }

      // Check if admin is trying to invite themselves
      if (currentUserEmail) {
        const adminEmail = emailList.find(email => email.toLowerCase() === currentUserEmail.toLowerCase())
        if (adminEmail) {
          errors.emails = 'You cannot invite yourself to the group'
        }
      }

      if (emailList.length > 10) {
        errors.emails = 'Maximum 10 email addresses allowed'
      }

      return errors
    },
    onSubmit: async (values) => {
      try {
        const emailList = values.emails
          .split(/[,\n]/)
          .map(email => email.trim().toLowerCase())
          .filter((email, index, arr) => email.length > 0 && arr.indexOf(email) === index) // Remove duplicates

        const result = await onInviteUsers(emailList)
        setInvitations(result)
        setShowInvitations(true)
        resetForm()
      } catch (error) {
        setFieldError('general', error instanceof Error ? error.message : 'Failed to send invitations')
      }
    },
  })

  const checkEmailAccounts = async (emails: string[]) => {
    const status: Record<string, boolean> = {}
    
    for (const email of emails) {
      const normalizedEmail = email.trim().toLowerCase()
      try {
        const user = await getUserByEmail(normalizedEmail)
        status[normalizedEmail] = !!user
      } catch (error) {
        console.error(`Error checking account for ${normalizedEmail}:`, error)
        status[normalizedEmail] = false
      }
    }
    
    setEmailAccountStatus(status)
  }

  const handleClose = () => {
    resetForm()
    setInvitations([])
    setShowInvitations(false)
    setEmailAccountStatus({})
    onClose()
  }

  const copyInvitationLink = async (invitationCode: string) => {
    const link = generateInvitationLink(invitationCode)
    try {
      await navigator.clipboard.writeText(link)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  if (showInvitations) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Invitations Sent Successfully"
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert variant="success">
            {invitations.length} invitation{invitations.length > 1 ? 's' : ''} sent successfully!
          </Alert>

          <p className="text-sm text-gray-600">
            Share these invitation links with the invited users:
          </p>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-sm text-gray-900">
                        {invitation.inviteeEmail}
                      </p>
                      {(invitation as any).hasAccount ? (
                        <Badge variant="success" size="sm">
                          ✓ Has Account
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          ⚠ No Account
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-mono break-all">
                      {generateInvitationLink(invitation.invitationCode)}
                    </p>
                    {(invitation as any).hasAccount && (
                      <p className="text-xs text-green-600 mt-1">
                        📧 User has been notified in-app
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyInvitationLink(invitation.invitationCode)}
                  >
                    Copy Link
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              How it works:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Invitations expire in 7 days</li>
              <li>• Users must have an account to accept invitations</li>
              <li>• They can click the link or use the invitation code</li>
            </ul>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Invite Users to ${groupName}`}
      size="md"
      footer={
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            onClick={handleSubmit}
          >
            Send Invitations
          </Button>
        </div>
      }
    >
      {errors.general && (
        <Alert variant="error" className="mb-4">
          {errors.general}
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Addresses *
          </label>
          <textarea
            value={values.emails}
            onChange={(e) => {
              handleChange('emails')(e as any)
              // Check accounts when user pauses typing
              const emails = e.target.value
                .split(/[,\n]/)
                .map(email => email.trim())
                .filter(email => email.length > 0 && validateEmail(email))
              
              if (emails.length > 0) {
                const timeoutId = setTimeout(() => {
                  checkEmailAccounts(emails)
                }, 500)
                return () => clearTimeout(timeoutId)
              }
            }}
            className={`
              w-full px-3 py-2 border rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:border-transparent
              ${errors.emails ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
            `}
            rows={6}
            placeholder="Enter email addresses (one per line or comma-separated)&#10;example@email.com&#10;another@email.com"
          />
          {errors.emails && (
            <p className="mt-1 text-sm text-red-600">{errors.emails}</p>
          )}
          
          {/* Email Status Preview */}
          {values.emails && Object.keys(emailAccountStatus).length > 0 && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Account Status Preview:</h4>
              <div className="space-y-1">
                {Object.entries(emailAccountStatus).map(([email, hasAccount]) => (
                  <div key={email} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{email}</span>
                    {hasAccount ? (
                      <Badge variant="success" size="sm">✓ Has Account</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">⚠ No Account</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <p className="mt-1 text-sm text-gray-500">
            Enter up to 10 email addresses, separated by commas or new lines
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">
            📧 Note about invitations:
          </h4>
          <p className="text-sm text-yellow-800">
            Invitations will be sent as shareable links. Make sure the recipients have 
            accounts on Happy Points to accept the invitations.
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default InviteUsersModal