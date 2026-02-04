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

export const BeatLoaderSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'small',
    color = 'var(--brand-primary)',
    className,
    loading = true
}) => {
    return (
        <div className={cn(
            "flex items-center justify-center min-h-100",
            className
        )}>
            {/* <div className="text-center"> */}
               
                <BeatLoader
                    color={color}
                    loading={loading}
                    cssOverride={{
                        display: "block",
                        margin: "0 auto",
                        borderColor: "transparent"
                    }}
                    size={sizeMap[size]}
                    aria-label="Loading Spinner"
                /> 
                
                {/* <p className="mt-4 text-sm text-muted-foreground">
                    loading...
                </p> */}
            {/* </div> */}
        </div>
    )
}
