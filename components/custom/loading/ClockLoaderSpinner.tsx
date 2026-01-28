import { cn } from '@/lib/utils'
import React from 'react'
import { HashLoader , RingLoader,
    BeatLoader,
    ClimbingBoxLoader,
    ClockLoader

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

export const ClockLoaderSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'large',
    color = 'white',
    className,
    loading
}) => {
    return (
        <div className={cn(
            "flex items-center justify-center min-h-[400px] bg-[#3B4A3F] h-screen w-screen fixed inset-0 z-50 top-0 left-0",
            className
        )}>
            <div className="text-center">
               
                <ClockLoader
                    color={color}
                    loading={loading}
                    cssOverride={{
                        display: "block",
                        margin: "0 auto",
                        borderColor: "transparent"
                    }}
                    // style={{
                    //     color: "black",
                    // }}
                    size={sizeMap[size]}
                    aria-label="Loading Spinner"
                /> 
                
                <p className="mt-10 font-bold text-2xl text-white">
                    GOODSEED.com
                </p>
            </div>
        </div>
    )
}
