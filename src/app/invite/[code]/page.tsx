'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getInvitationByCode, acceptInvitation } from '@/lib/groups'
import { GroupInvitation } from '@/types'
import { ROUTES, SUCCESS_MESSAGES } from '@/lib/constants'
import { Card, Button, Alert, LoadingSpinner } from '@/components/ui'
import { formatDate } from '@/lib/utils'

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()
  const [invitation, setInvitation] = useState<GroupInvitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const invitationCode = params.code as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`${ROUTES.LOGIN}?redirect=/invite/${invitationCode}`)
      return
    }

    if (!authLoading && user && invitationCode) {
      loadInvitation()
    }
  }, [authLoading, user, invitationCode, router])

  const loadInvitation = async () => {
    try {
      setLoading(true)
      const invitationData = await getInvitationByCode(invitationCode)
      setInvitation(invitationData)
      
      if (!invitationData) {
        setError('Invalid or expired invitation link')
      } else if (invitationData.status !== 'pending') {
        setError('This invitation has already been used')
      } else {
        const now = new Date()
        const expiresAt = invitationData.expiresAt instanceof Date 
          ? invitationData.expiresAt 
          : invitationData.expiresAt.toDate()
          
        if (now > expiresAt) {
          setError('This invitation has expired')
        }
      }
    } catch (error) {
      console.error('Error loading invitation:', error)
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!invitation || !user || !userProfile) return

    try {
      setAccepting(true)
      setError(null)

      await acceptInvitation(
        invitation.id,
        user.uid,
        userProfile.name,
        userProfile.email
      )

      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push(ROUTES.DASHBOARD)
      }, 2000)
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setError(error instanceof Error ? error.message : 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Group Invitation
          </h1>
          <p className="text-gray-600">
            You've been invited to join a group
          </p>
        </div>

        <Card>
          {success ? (
            <div className="text-center">
              <Alert variant="success" className="mb-4">
                {SUCCESS_MESSAGES.GROUP.INVITATION_ACCEPTED}
              </Alert>
              <p className="text-gray-600">
                Redirecting to dashboard...
              </p>
            </div>
          ) : error ? (
            <div className="text-center">
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
              <Button
                variant="outline"
                onClick={() => router.push(ROUTES.DASHBOARD)}
              >
                Go to Dashboard
              </Button>
            </div>
          ) : invitation ? (
            <div>
              <div className="text-center mb-6">
                <div className="bg-blue-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Join "{invitation.groupName}"
                </h2>
                <p className="text-gray-600">
                  Invited by {invitation.adminName}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Group:</span>
                    <span className="font-medium">{invitation.groupName}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Invited by:</span>
                    <span>{invitation.adminName}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Expires:</span>
                    <span>{formatDate(invitation.expiresAt)}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-center">
                  By accepting this invitation, you'll become a member of this group 
                  and can participate in group activities.
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push(ROUTES.DASHBOARD)}
                >
                  Decline
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAcceptInvitation}
                  loading={accepting}
                >
                  Accept Invitation
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Alert variant="error">
                Invitation not found or invalid
              </Alert>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}