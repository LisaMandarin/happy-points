import React from 'react'
import { Input as AntInput } from 'antd'
import type { InputProps as AntInputProps } from 'antd'

interface InputProps extends Omit<AntInputProps, 'size'> {
  label?: string
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  size = 'md',
  ...props
}) => {
  const getAntSize = (): AntInputProps['size'] => {
    switch (size) {
      case 'sm':
        return 'small'
      case 'lg':
        return 'large'
      case 'md':
      default:
        return 'middle'
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <AntInput
        size={getAntSize()}
        status={error ? 'error' : undefined}
        className={className}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {!error && helperText && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
}

export default Input