import React from 'react'
import { Button as AntButton } from 'antd'
import type { ButtonProps as AntButtonProps } from 'antd'

interface ButtonProps extends Omit<AntButtonProps, 'type' | 'size' | 'variant'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  type,
  ...props
}) => {
  const getAntType = (): AntButtonProps['type'] => {
    switch (variant) {
      case 'primary':
        return 'primary'
      case 'danger':
        return 'primary'
      case 'outline':
        return 'default'
      case 'secondary':
      default:
        return 'default'
    }
  }

  const getAntSize = (): AntButtonProps['size'] => {
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

  const getButtonClass = (): string => {
    let classes = className
    
    if (variant === 'danger') {
      classes += ' bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700'
    } else if (variant === 'secondary') {
      classes += ' bg-gray-600 hover:bg-gray-700 border-gray-600 hover:border-gray-700 text-white'
    }
    
    return classes
  }

  return (
    <AntButton
      type={getAntType()}
      size={getAntSize()}
      loading={loading}
      className={getButtonClass()}
      danger={variant === 'danger'}
      htmlType={type}
      {...props}
    >
      {children}
    </AntButton>
  )
}

export default Button