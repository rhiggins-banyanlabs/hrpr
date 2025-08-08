import { ReactNode, useEffect } from 'react'
import Button from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

export default function Modal({ isOpen, onClose, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    console.log('🪟 Modal component - isOpen:', isOpen)
    
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      console.log('🪟 Modal opened - body overflow hidden')
    } else {
      document.body.style.overflow = 'unset'
      console.log('🪟 Modal closed - body overflow restored')
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) {
    console.log('🪟 Modal not open, returning null')
    return null
  }

  console.log('🪟 Modal rendering with size:', size)

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ zIndex: 9999 }} // Force high z-index
      onClick={(e) => {
        // Close modal if clicking on backdrop
        if (e.target === e.currentTarget) {
          console.log('🪟 Backdrop clicked, closing modal')
          onClose()
        }
      }}
    >
      <div 
        className={`bg-slate-800/90 backdrop-blur-xl rounded-xl w-full ${sizeClasses[size]} border border-white/10 max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        {children}
      </div>
    </div>
  )
}

interface ModalHeaderProps {
  children: ReactNode
  onClose?: () => void
  className?: string
}

export function ModalHeader({ children, onClose, className = '' }: ModalHeaderProps) {
  return (
    <div className={`p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0 ${className}`}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <Button variant="ghost" size="sm" onClick={onClose} className="ml-4">
          ✕
        </Button>
      )}
    </div>
  )
}

interface ModalContentProps {
  children: ReactNode
  className?: string
}

export function ModalContent({ children, className = '' }: ModalContentProps) {
  return (
    <div className={`flex-1 overflow-y-auto ${className}`}>
      {children}
    </div>
  )
}

interface ModalFooterProps {
  children: ReactNode
  className?: string
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`p-6 border-t border-white/10 flex gap-3 justify-end flex-shrink-0 ${className}`}>
      {children}
    </div>
  )
}