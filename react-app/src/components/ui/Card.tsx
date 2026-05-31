import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx('design-card overflow-hidden transition-shadow duration-150 hover:shadow-[var(--shadow-card-lg)]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div className={clsx('border-b border-line px-5 py-4 md:px-6', className)} {...props}>
      {children}
    </div>
  )
}

export function CardBody({ children, className, ...props }: CardProps) {
  return (
    <div className={clsx('p-5 md:p-6', className)} {...props}>
      {children}
    </div>
  )
}
