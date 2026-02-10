import { ReactNode } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheckCircle, faTimesCircle } from "@fortawesome/free-solid-svg-icons"
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
  const getIcon = () => {
    if (variant === "active") {
      return <FontAwesomeIcon icon={faCheckCircle} className={styles.badgeIcon} />
    }
    if (variant === "inactive") {
      return <FontAwesomeIcon icon={faTimesCircle} className={styles.badgeIcon} />
    }
    return null
  }

  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {getIcon()}
      {children}
    </span>
  )
}
