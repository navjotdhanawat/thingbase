'use client';

import { cn } from '@/lib/utils';

interface ValueWidgetProps {
    label: string;
    value: unknown;
    unit?: string;
    icon?: React.ReactNode;
    color?: string;
    className?: string;
}

export function ValueWidget({
    label,
    value,
    unit,
    icon,
    color,
    className,
}: ValueWidgetProps) {
    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${Math.floor(seconds)}s`;
        const m = Math.floor(seconds / 60);
        if (m < 60) return `${m}m ${Math.floor(seconds % 60)}s`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ${m % 60}m`;
        const d = Math.floor(h / 24);
        return `${d}d ${h % 24}h`;
    };

    const formatValue = (val: unknown): string => {
        if (val === null || val === undefined) return '-';
        if (typeof val === 'boolean') return val ? 'ON' : 'OFF';

        if (typeof val === 'number') {
            // Special handling for durations if unit is 's'
            if (unit === 's' && val > 60) {
                return formatDuration(val);
            }

            // Only use 'k' suffix for values >= 10000 to keep precision for smaller numbers
            if (Math.abs(val) >= 10000) {
                return `${(val / 1000).toFixed(1)}k`;
            }

            // Handle floating point precision
            if (val % 1 !== 0) {
                return val.toFixed(1);
            }
            return val.toString();
        }

        const str = String(val);
        return str.length > 20 ? `${str.substring(0, 20)}...` : str;
    };

    return (
        <div
            className={cn(
                'rounded-xl bg-muted/50 p-4 flex flex-col justify-center',
                className
            )}
        >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                {icon && <span style={{ color }}>{icon}</span>}
                <span className="truncate">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span
                    className="text-2xl font-bold"
                    style={{ color }}
                >
                    {formatValue(value)}
                </span>
                {unit && !(unit === 's' && typeof value === 'number' && value > 60) && (
                    <span
                        className="text-sm font-medium opacity-70"
                        style={{ color }}
                    >
                        {unit}
                    </span>
                )}
            </div>
        </div>
    );
}
