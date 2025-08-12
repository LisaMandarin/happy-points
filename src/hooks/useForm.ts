import { useState, useCallback } from 'react'
import { FormErrors } from '@/types'

interface UseFormOptions<T> {
  initialValues: T
  validate?: (values: T) => FormErrors
  onSubmit: (values: T) => Promise<void> | void
}

interface UseFormReturn<T> {
  values: T
  errors: FormErrors
  isSubmitting: boolean
  isValid: boolean
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  setFieldError: (field: keyof T, error: string) => void
  setFieldValue: (field: keyof T, value: any) => void
  resetForm: () => void
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = useCallback(
    (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setValues(prev => ({ ...prev, [field]: value }))
      
      // Clear error when user starts typing
      if (errors[field as string]) {
        setErrors(prev => ({ ...prev, [field as string]: '' }))
      }
    },
    [errors]
  )

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field as string]: error }))
  }, [])

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }, [])

  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setIsSubmitting(false)
  }, [initialValues])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitting(true)

      try {
        // Validate if validator is provided
        if (validate) {
          const validationErrors = validate(values)
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            return
          }
        }

        // Clear previous errors
        setErrors({})

        // Submit form
        await onSubmit(values)
      } catch (error) {
        console.error('Form submission error:', error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, validate, onSubmit]
  )

  const isValid = Object.keys(errors).length === 0

  return {
    values,
    errors,
    isSubmitting,
    isValid,
    handleChange,
    handleSubmit,
    setFieldError,
    setFieldValue,
    resetForm,
  }
}