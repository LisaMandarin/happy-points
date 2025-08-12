'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithEmail, signInWithGoogle } from '@/lib/auth'
import { validateLoginForm } from '@/lib/utils'
import { useForm } from '@/hooks/useForm'
import { LoginFormData } from '@/types'
import { ROUTES } from '@/lib/constants'
import { Button, Input, Alert } from '@/components/ui'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || ROUTES.DASHBOARD

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldError,
  } = useForm<LoginFormData>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: (values) => validateLoginForm(values.email, values.password),
    onSubmit: async (values) => {
      try {
        const { user, error } = await signInWithEmail(values.email, values.password)
        
        console.log('Sign in result:', { user: !!user, error })
        
        if (error) {
          setFieldError('general', error)
          return // Don't throw, just return to stay in error state
        } else if (user) {
          router.push(redirectUrl)
        }
      } catch (error) {
        console.error('Sign in exception:', error)
        setFieldError('general', 'An unexpected error occurred. Please try again.')
      }
    },
  })

  const handleGoogleSignIn = async () => {
    try {
      const { user, error } = await signInWithGoogle()
      
      if (error) {
        setFieldError('general', error)
      } else if (user) {
        router.push(redirectUrl)
      }
    } catch (error) {
      console.error('Google sign-in error:', error)
      setFieldError('general', 'Failed to sign in with Google. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {errors.general && (
          <Alert variant="error">
            <div>
              <strong>Login Failed:</strong> {errors.general}
              {errors.general.includes('Invalid email or password') && (
                <div className="mt-2 text-sm">
                  <p>Please check:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Email address is correct</li>
                    <li>Password is correct (case-sensitive)</li>
                    <li>Account exists - you might need to <a href="/register" className="underline text-red-700 hover:text-red-800">register first</a></li>
                  </ul>
                </div>
              )}
              {errors.general.includes('Too many failed') && (
                <div className="mt-2 text-sm">
                  <p>Please wait a few minutes before trying again, or try:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Refreshing the page</li>
                    <li>Using a different network</li>
                    <li>Checking if your account is locked</li>
                  </ul>
                </div>
              )}
              {errors.general.includes('Network error') && (
                <div className="mt-2 text-sm">
                  <p>Connection issues detected. Please try:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Checking your internet connection</li>
                    <li>Refreshing the page</li>
                    <li>Trying again in a moment</li>
                  </ul>
                </div>
              )}
            </div>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={handleChange('email')}
            error={errors.email}
            placeholder="Enter your email"
            required
          />

          <Input
            label="Password"
            type="password"
            value={values.password}
            onChange={handleChange('password')}
            error={errors.password}
            placeholder="Enter your password"
            required
          />

          <Button 
            type="submit" 
            loading={isSubmitting}
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full"
              disabled={isSubmitting}
            >
              <span className="text-red-500 font-bold mr-2">G</span>
              {isSubmitting ? 'Signing In...' : 'Google'}
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href={ROUTES.REGISTER} className="text-blue-600 hover:text-blue-500 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}