import { ReactNode } from "react"
import styles from "./dashboardAdmin.module.css"

interface DashboardStatsCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: string
    isPositive: boolean
  }
  className?: string
}

export function DashboardStatsCard({
  label,
  value,
  icon,
  trend,
  className = "",
}: DashboardStatsCardProps) {
  return (
    <div className={`${styles.statsCard} ${className}`}>
      <div className={styles.label}>{label}</div>
      <div className={`${styles.content} flex flex-row items-center gap-1 `}>
        <div className={styles.value}>{value}</div>
        {icon && <div className={styles.icon}>{icon}</div>}
      </div>
      {trend && (
        <div className={styles.trend}>
          <span
            className={`${styles.trendValue} ${trend.isPositive ? styles.trendPositive : styles.trendNegative
              }`}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
          <span className={styles.trendLabel}>vs last period</span>
        </div>
      )}
    </div>
  )
}
