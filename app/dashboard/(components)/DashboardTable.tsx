import { ReactNode } from "react"

interface DashboardTableProps {
  children: ReactNode
  className?: string
}

export function DashboardTable({ children, className = "" }: DashboardTableProps) {
  return (
    <div
      className={`border-[6px] border-(--border-color) bg-(--bg-main) overflow-hidden ${className}`}
    >
      <table className="w-full">{children}</table>
    </div>
  )
}

interface DashboardTableHeaderProps {
  children: ReactNode
}

export function DashboardTableHeader({ children }: DashboardTableHeaderProps) {
  return (
    <thead className="bg-(--bg-section) border-b-[3px] border-(--border-color)">
      {children}
    </thead>
  )
}

interface DashboardTableBodyProps {
  children: ReactNode
}

export function DashboardTableBody({ children }: DashboardTableBodyProps) {
  return <tbody>{children}</tbody>
}

interface DashboardTableRowProps {
  children: ReactNode
  className?: string
}

export function DashboardTableRow({ children, className = "" }: DashboardTableRowProps) {
  return (
    <tr
      className={`border-b-[3px] border-(--border-color) last:border-b-0 hover:bg-(--bg-section) transition-colors ${className}`}
    >
      {children}
    </tr>
  )
}

interface DashboardTableCellProps {
  children: ReactNode
  isHeader?: boolean
  className?: string
}

export function DashboardTableCell({
  children,
  isHeader = false,
  className = "",
}: DashboardTableCellProps) {
  const Component = isHeader ? "th" : "td"
  const baseStyles = "px-4 py-3 text-left font-['Poppins']"
  const headerStyles = isHeader
    ? "font-bold text-xs uppercase text-(--text-primary)"
    : "font-medium text-sm text-(--text-primary)"

  return (
    <Component className={`${baseStyles} ${headerStyles} ${className}`}>
      {children}
    </Component>
  )
}
