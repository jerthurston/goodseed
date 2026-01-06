"use client"

import styles from "./dashboardAdmin.module.css"

interface DashboardToggleProps {
  isActive: boolean
  onChange: (isActive: boolean) => void
  label?: string
  disabled?: boolean
}

export function DashboardToggle({
  isActive,
  onChange,
  label,
  disabled = false,
}: DashboardToggleProps) {
  return (
    <div className={styles.toggleContainer}>
      {label && <span className={styles.toggleLabel}>
        {label}
        </span>}
      <button
        onClick={() => !disabled && onChange(!isActive)}
        disabled={disabled}
        className={`${styles.toggle} ${isActive ? styles.toggleActive : ""}`}
      >
        <span
          className={`${styles.toggleThumb} ${isActive ? styles.toggleThumbActive : ""
            }`}
        />
      </button>
      <span
        className={`${styles.toggleStatus} ${isActive ? styles.toggleStatusActive : styles.toggleStatusInactive
          }`}
      >
        {isActive ? "ACTIVE" : "INACTIVE"}
      </span>
    </div>
  )
}
