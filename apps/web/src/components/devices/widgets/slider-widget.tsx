'use client';

import { useState, useEffect, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SliderWidgetProps {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    icon?: React.ReactNode;
    color?: string;
    precision?: number;
    isLoading?: boolean;
    onChange: (value: number) => void;
    className?: string;
}

export function SliderWidget({
    label,
    value,
    min = 0,
    max = 100,
    step = 1,
    unit,
    icon,
    color,
    precision = 0,
    isLoading = false,
    onChange,
    className,
}: SliderWidgetProps) {
    const [currentValue, setCurrentValue] = useState(value);
    const [isDragging, setIsDragging] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isDragging) {
            setCurrentValue(value);
        }
    }, [value, isDragging]);

    const handleValueChange = (newValue: number[]) => {
        setCurrentValue(newValue[0]);
    };

    const handleValueCommit = (newValue: number[]) => {
        setIsDragging(false);

        // Debounce the API call
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            onChange(newValue[0]);
        }, 300);
    };

    return (
        <div
            className={cn(
                'rounded-xl bg-muted/50 p-4',
                className
            )}
        >
            {/* Header row */}
            <div className="flex items-center gap-2 mb-3">
                {icon && (
                    <span style={{ color }}>{icon}</span>
                )}
                <span className="font-medium flex-1 truncate">{label}</span>
                {isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                <span
                    className="text-lg font-bold"
                    style={{ color }}
                >
                    {currentValue.toFixed(precision)}{unit && <span className="text-sm ml-0.5">{unit}</span>}
                </span>
            </div>

            {/* Slider */}
            <Slider
                value={[currentValue]}
                min={min}
                max={max}
                step={step}
                onValueChange={handleValueChange}
                onValueCommit={handleValueCommit}
                onPointerDown={() => setIsDragging(true)}
                disabled={isLoading}
                className="my-2"
            />

            {/* Min/Max labels */}
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    );
}
