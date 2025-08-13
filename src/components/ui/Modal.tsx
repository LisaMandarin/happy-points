import React from 'react'
import { Modal as AntModal } from 'antd'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}) => {
  const getWidth = (): string => {
    switch (size) {
      case 'sm':
        return '400px'
      case 'lg':
        return '800px'
      case 'xl':
        return '1200px'
      case 'md':
      default:
        return '600px'
    }
  }

  return (
    <AntModal
      title={title}
      open={isOpen}
      onCancel={onClose}
      footer={footer}
      width={getWidth()}
      centered
      destroyOnHidden
    >
      {children}
    </AntModal>
  )
}

export default Modal