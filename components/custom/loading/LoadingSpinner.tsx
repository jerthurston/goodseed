import { cn } from '@/lib/utils'
import React from 'react'
import { HashLoader } from 'react-spinners'

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large'
    color?: string
    className?: string
    loading?: boolean
}

const sizeMap = {
    small: 30,
    medium: 50,
    large: 70
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'medium',
    color = "#FF6B34",
    className,
    loading = true
}) => {
    return (
        <div className={cn(
            "flex items-center justify-center min-h-[400px]",
            className
        )}>
            <div className="text-center">
                <HashLoader
                    color={color}
                    loading={loading}
                    cssOverride={{
                        display: "block",
                        margin: "0 auto",
                        borderColor: "transparent"
                    }}
                    size={sizeMap[size]}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                />
                <p className="mt-4 text-sm text-muted-foreground">
                    Đang tải...
                </p>
            </div>
        </div>
    )
}
