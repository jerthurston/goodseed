interface DashboardProgressBarProps {
  label?: string
  percentage: number
  showLabel?: boolean
  variant?: "success" | "warning" | "danger"
  className?: string
}

export function DashboardProgressBar({
  label,
  percentage,
  showLabel = true,
  variant = "success",
  className = "",
}: DashboardProgressBarProps) {
  const variantColors = {
    success: "bg-(--brand-primary)",
    warning: "bg-(--accent-cta)",
    danger: "bg-(--danger-color)",
  }

  const textColors = {
    success: "text-(--brand-primary)",
    warning: "text-[#f39c12]",
    danger: "text-(--danger-color)",
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-sm font-['Poppins'] font-medium">
          <span className={`${textColors[variant]} font-semibold`}>{label}</span>
          <span className={`${textColors[variant]} font-semibold text-xl`}>{percentage}%</span>
        </div>
      )}
      <div className="h-3 border-[3px] border-(--border-color) bg-(--bg-section) overflow-hidden">
        <div
          className={`h-full ${variantColors[variant]} transition-all duration-500`}
          style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        />
      </div>
    </div>
  )
}
