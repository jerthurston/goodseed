export const PotencyBadge = ({
    value,
    label,
    className
}: {
    value?: number | { min: number; max: number };
    label: string;
    className: string;
}) => {
    // Handle undefined/null values
    if (value === undefined || value === null) {
        return (
            <span className={`spec-item ${className}`}>
                {label} low
            </span>
        );
    }

    if (typeof value === 'number') {
        return (
            <span className={`spec-item ${className}`}>
                {label} {value}%
            </span>
        );
    }

    if (value.min === value.max) {
        return (
            <span className={`spec-item ${className}`}>
                {label} {value.min}%
            </span>
        );
    }

    return (
        <span className={`spec-item ${className}`}>
            <span className="potency-label">{label}</span>
            <span className="potency-range">
                <span className="potency-min">{value.min}</span>
                <span className="potency-separator">-</span>
                <span className="potency-max">{value.max}</span>
                <span className="potency-unit">%</span>
            </span>
        </span>
    );
};