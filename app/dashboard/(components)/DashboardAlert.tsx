import { ReactNode } from "react"
import styles from "./dashboardAdmin.module.css"

export type DashboardAlertVariant = "critical" | "warning" | "success" | "info"

interface DashboardAlertProps {
  variant: DashboardAlertVariant
  title: string
  message: string
  icon?: ReactNode
  className?: string
}

export function DashboardAlert({
  variant,
  title,
  message,
  icon,
  className = "",
}: DashboardAlertProps) {
  const defaultIcons = {
    critical: "⚠",
    warning: "⚠",
    success: "✓",
    info: "ℹ",
  }

  return (
    <div className={`${styles.alert} ${styles[variant]} ${className}`}>
      <div className={styles.icon}>{icon || defaultIcons[variant]}</div>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.message}>{message}</div>
      </div>
    </div>
  )
}
