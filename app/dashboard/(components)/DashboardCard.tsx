import { ReactNode } from "react"
import styles from "./dashboardAdmin.module.css"

interface DashboardCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function DashboardCard({
  children,
  className = "",
  hover = false,
}: DashboardCardProps) {
  return (
    <div
      className={`${styles.card} ${hover ? styles.cardHover : ""} ${className}`}
    >
      {children}
    </div>
  )
}

// Card Header
interface DashboardCardHeaderProps {
  children: ReactNode
  className?: string
}

export function DashboardCardHeader({
  children,
  className = "",
}: DashboardCardHeaderProps) {
  return (
    <div className={`${styles.cardHeader} ${className}`}>
      {children}
    </div>
  )
}

// Card Body
interface DashboardCardBodyProps {
  children: ReactNode
  className?: string
}

export function DashboardCardBody({
  children,
  className = "",
}: DashboardCardBodyProps) {
  return <div className={`${styles.cardBody} ${className}`}>{children}</div>
}

// Card Footer
interface DashboardCardFooterProps {
  children: ReactNode
  className?: string
}

export function DashboardCardFooter({
  children,
  className = "",
}: DashboardCardFooterProps) {
  return (
    <div className={`${styles.cardFooter} ${className}`}>
      {children}
    </div>
  )
}
