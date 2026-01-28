import { cn } from '@/lib/utils'
import React from 'react'
import { HashLoader , RingLoader,
    BeatLoader,
    ClimbingBoxLoader

 } from 'react-spinners'

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

export const ClimbingBoxLoaderSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'small',
    color = 'var(--brand-primary)',
    className,
    loading
}) => {
    return (
        <div className={cn(
            "flex items-center justify-center min-h-[400px]",
            className
        )}>
            <div className="text-center">
               
                <ClimbingBoxLoader
                    color={color}
                    loading={loading}
                    cssOverride={{
                        display: "block",
                        margin: "0 auto",
                        borderColor: "transparent"
                    }}
                    style={{
                        color: "black",
                    }}
                    size={sizeMap[size]}
                    aria-label="Loading Spinner"
                /> 
                
                {/* <p className="mt-4 text-sm text-muted-foreground">
                    loading...
                </p> */}
            </div>
        </div>
    )
}
