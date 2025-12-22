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
    const formatValue = (val: unknown): string => {
        if (val === null || val === undefined) return '-';
        if (typeof val === 'boolean') return val ? 'ON' : 'OFF';
        if (typeof val === 'number') {
            if (Math.abs(val) >= 1000) {
                return `${(val / 1000).toFixed(1)}k`;
            }
            return val % 1 === 0 ? val.toString() : val.toFixed(1);
        }
        const str = String(val);
        return str.length > 15 ? `${str.substring(0, 15)}...` : str;
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
                {unit && (
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
