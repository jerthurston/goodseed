import React from 'react';

interface JobStatusCardProps {
  count: number;
  label: string;
  backgroundColor: string;
  textColor: string;
  size: 'small' | 'large';
}

const JobStatusCard: React.FC<JobStatusCardProps> = ({
  count,
  label,
  backgroundColor,
  textColor,
  size
}) => {
  const isLargeSize = size === 'large';
  
  return (
    <div 
      className={`text-center ${isLargeSize ? 'p-4' : 'p-3'}`}
      style={{ 
        backgroundColor,
        border: isLargeSize ? '3px solid var(--border-color)' : '2px solid var(--border-color)',
        boxShadow: isLargeSize ? '4px 4px 0 var(--border-color)' : 'none',
        borderRadius: isLargeSize ? '0' : '8px'
      }}
    >
      <div 
        className={`${isLargeSize ? 'text-2xl' : 'text-lg'} font-bold font-['Poppins']`}
        style={{ color: textColor }}
      >
        {count}
      </div>
      <div 
        className={`${isLargeSize ? 'text-sm' : 'text-xs'} font-['Poppins']`}
        style={{ 
          color: isLargeSize ? textColor : 'var(--text-primary-muted)'
        }}
      >
        {label}
      </div>
    </div>
  );
};

export default JobStatusCard;