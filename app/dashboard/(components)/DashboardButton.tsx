import { ButtonHTMLAttributes, ReactNode } from "react"
import styles from "./dashboardAdmin.module.css"

export type DashboardButtonVariant = "primary" | "secondary" | "outline" | "danger"

interface DashboardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DashboardButtonVariant
  children: ReactNode
  isLoading?: boolean
}

export function DashboardButton({
  variant = "primary",
  children,
  isLoading = false,
  className = "",
  disabled,
  ...props
}: DashboardButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className={styles.loading}>
          <span className={styles.spinner} />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}

// Icon Button
interface DashboardIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DashboardButtonVariant
  icon: ReactNode
}

export function DashboardIconButton({
  variant = "primary",
  icon,
  className = "",
  ...props
}: DashboardIconButtonProps) {
  return (
    <button
      className={`${styles.iconButton} ${styles[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  )
}
