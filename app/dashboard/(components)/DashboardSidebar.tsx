"use client"

import { ReactNode } from "react"
import styles from "./dashboardAdmin.module.css"

interface DashboardSidebarProps {
  children: ReactNode
  title?: string
}

export function DashboardSidebar({ children, title }: DashboardSidebarProps) {
  return (
    <div className={styles.sidebar}>
      {title && <h2 className={styles.sidebarTitle}>{title}</h2>}
      <nav className={`${styles.sidebarNav}`}>{children}</nav>
    </div>
  )
}

interface DashboardSidebarItemProps {
  children: ReactNode
  isActive?: boolean
  onClick?: () => void
  icon?: ReactNode
}

export function DashboardSidebarItem({
  children,
  isActive = false,
  onClick,
  icon,
}: DashboardSidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ""}`}
    >
      {icon && <span className={styles.sidebarItemIcon}>{icon}</span>}
      <span>{children}</span>
    </button>
  )
}
