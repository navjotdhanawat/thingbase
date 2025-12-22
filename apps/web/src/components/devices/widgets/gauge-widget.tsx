'use client';

import { cn } from '@/lib/utils';

interface GaugeWidgetProps {
    label: string;
    value: number;
    min?: number;
    max?: number;
    unit?: string;
    icon?: React.ReactNode;
    color?: string;
    precision?: number;
    className?: string;
}

export function GaugeWidget({
    label,
    value,
    min = 0,
    max = 100,
    unit,
    icon,
    color = 'hsl(var(--primary))',
    precision = 1,
    className,
}: GaugeWidgetProps) {
    const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

    // Calculate the arc path
    const radius = 40;
    const strokeWidth = 8;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;

    // We'll use 270 degrees of the circle (3/4)
    const arcLength = circumference * 0.75;
    const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

    return (
        <div
            className={cn(
                'rounded-xl bg-muted/50 p-4 flex flex-col items-center justify-center',
                className
            )}
        >
            {/* Gauge SVG */}
            <div className="relative w-24 h-24">
                <svg
                    className="transform rotate-135"
                    width="96"
                    height="96"
                    viewBox="0 0 96 96"
                >
                    {/* Background arc */}
                    <circle
                        className="text-muted-foreground/20"
                        strokeWidth={strokeWidth}
                        stroke="currentColor"
                        fill="transparent"
                        r={normalizedRadius}
                        cx="48"
                        cy="48"
                        strokeDasharray={`${arcLength} ${circumference}`}
                        strokeLinecap="round"
                    />
                    {/* Value arc */}
                    <circle
                        strokeWidth={strokeWidth}
                        stroke={color}
                        fill="transparent"
                        r={normalizedRadius}
                        cx="48"
                        cy="48"
                        strokeDasharray={`${arcLength} ${circumference}`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                    />
                </svg>
                {/* Center value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                        className="text-lg font-bold"
                        style={{ color }}
                    >
                        {value.toFixed(precision)}
                    </span>
                    {unit && (
                        <span
                            className="text-xs font-medium opacity-70"
                            style={{ color }}
                        >
                            {unit}
                        </span>
                    )}
                </div>
            </div>

            {/* Label */}
            <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                {icon && <span style={{ color }}>{icon}</span>}
                <span className="truncate">{label}</span>
            </div>
        </div>
    );
}
