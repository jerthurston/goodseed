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
      <div className="px-4 py-6">
        {/* Page Header */}
        {/* <div className="mb-8">
          <h1 className="font-['Archivo_Black'] text-5xl uppercase text-(--brand-primary) tracking-tight mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="font-['Poppins'] text-lg text-(--text-primary-muted)">
              {subtitle}
            </p>
          )}
        </div> */}

        {/* Layout Grid */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-[350px] shrink-0">{sidebar}</aside>

          {/* Main Content */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
