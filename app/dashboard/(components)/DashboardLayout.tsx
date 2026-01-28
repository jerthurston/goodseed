"use client"

import { ReactNode } from "react"

interface DashboardLayoutProps {
  children: ReactNode
  sidebar: ReactNode
  title?: string
  subtitle?: string
}

export function DashboardLayout({
  children,
  sidebar,
  title,
  subtitle,
}: DashboardLayoutProps) {
  return (
    <div className="max-w-[1440px] w-full min-h-screen bg-(--bg-main)">
      <div className="px-1 lg:px-4 py-1">
        {/* Layout Grid */}
        <div className="flex gap-0 lg:gap-5">
          {/* Sidebar - visible on desktop only */}
          <aside className="w-0 lg:w-[350px] shrink-0 overflow-hidden lg:overflow-visible">{sidebar}</aside>
          {/* Main Content */}
          <main className="flex-1 w-full">{children}</main>
        </div>
      </div>
    </div>
  )
}
