"use client"

import { Home, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import styles from "./dashboardAdmin.module.css"

interface BreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

interface AdminBreadcrumbProps {
  items: BreadcrumbItem[]
}

export function AdminBreadcrumb({ items }: AdminBreadcrumbProps) {
  const router = useRouter()

  const handleNavigation = (href?: string) => {
    if (href) {
      router.push(href)
    }
  }

  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <ol className={styles.breadcrumbList}>
        {/* Home icon as first item */}
        <li className={styles.breadcrumbItem}>
          <button
            onClick={() => handleNavigation("/")}
            className={styles.breadcrumbLink}
            aria-label="Go to homepage"
          >
            <Home className="w-4 h-4" />
          </button>
          {items.length > 0 && (
            <ChevronRight className={`${styles.breadcrumbSeparator} w-4 h-4`} />
          )}
        </li>

        {/* Breadcrumb items */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className={styles.breadcrumbItem}>
              {item.href && !isLast ? (
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={styles.breadcrumbLink}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={`${styles.breadcrumbCurrent} ${
                    isLast ? styles.breadcrumbActive : ""
                  }`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className={`${styles.breadcrumbSeparator} w-4 h-4`} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
