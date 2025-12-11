import { ReactNode } from "react"
import styles from "./dashboardAdmin.module.css"

export type DashboardBadgeVariant =
  | "active"
  | "inactive"
  | "inProgress"
  | "completed"
  | "failed"
  | "warning"

interface DashboardBadgeProps {
  variant: DashboardBadgeVariant
  children: ReactNode
  className?: string
}

export function DashboardBadge({
  variant,
  children,
  className = "",
}: DashboardBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}
