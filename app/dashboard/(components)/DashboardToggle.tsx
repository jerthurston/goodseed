"use client"

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
    <div className="flex items-center gap-3">
      {label && (
        <span className="font-['Poppins'] font-medium text-sm text-(--text-primary)">
          {label}
        </span>
      )}
      <button
        onClick={() => !disabled && onChange(!isActive)}
        disabled={disabled}
        className={`
          relative w-16 h-8 border-[3px] border-(--border-color)
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isActive ? "bg-(--brand-primary)" : "bg-(--bg-section)"}
        `}
      >
        <span
          className={`
            absolute top-0.5 h-5 w-5 bg-white border-2 border-(--border-color)
            transition-transform duration-200
            ${isActive ? "translate-x-8" : "translate-x-0.5"}
          `}
        />
      </button>
      <span
        className={`font-['Poppins'] font-semibold text-xs uppercase ${isActive ? "text-(--brand-primary)" : "text-(--text-primary-muted)"
          }`}
      >
        {isActive ? "ACTIVE" : "INACTIVE"}
      </span>
    </div>
  )
}
